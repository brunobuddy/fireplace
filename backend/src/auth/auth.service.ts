import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { compareSync } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { EnvUserStore } from './users/env-user.store';
import { Member } from '../family/entities/member.entity';
import { AuthUser, JwtPayload } from './auth.types';

/** A stored secret beginning like this is treated as a bcrypt hash. */
const BCRYPT_PREFIX = /^\$2[aby]\$/;

/**
 * Validates credentials against the env-backed user directory and mints /
 * verifies JWTs. Passwords are checked in constant time (plaintext) or with
 * bcrypt when the stored secret is a hash, so neither path leaks timing.
 *
 * After a successful credential check, the email is resolved to the matching
 * family member and the JWT is loaded with everything controllers need to
 * attribute writes (memberId, familyId, name, role, color) — the client never
 * has to declare "who did this".
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: EnvUserStore,
    private readonly jwt: JwtService,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
  ) {}

  /** True when the email+password pair matches the env credential directory. */
  private credentialsOk(email: string, password: string): boolean {
    const record = this.users.findByEmail(email);
    if (!record) {
      return false;
    }
    return BCRYPT_PREFIX.test(record.secret)
      ? compareSync(password, record.secret)
      : constantTimeEqual(password, record.secret);
  }

  /** Authenticates and returns a signed token + the user's profile. Throws 401. */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: AuthUser }> {
    if (!this.credentialsOk(email, password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const member = await this.members.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!member) {
      // Credentials matched but no member row exists yet — the seeder runs on
      // boot, so this only happens if AUTH_USERS was changed without a restart.
      throw new UnauthorizedException('No member profile for that email');
    }
    const user = toAuthUser(member);
    const payload: JwtPayload = { sub: user.memberId, ...user };
    return { token: this.jwt.sign(payload), user };
  }

  /** Verifies a token (HTTP or websocket) and returns the user. Throws if invalid. */
  verify(token: string): AuthUser {
    const payload = this.jwt.verify<JwtPayload>(token);
    return {
      memberId: payload.memberId,
      familyId: payload.familyId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      color: payload.color,
    };
  }
}

function toAuthUser(member: Member): AuthUser {
  return {
    memberId: member.id,
    familyId: member.familyId,
    email: member.email,
    name: member.name,
    role: member.role,
    color: member.color,
  };
}

/** Length-safe, constant-time comparison via fixed-size SHA-256 digests. */
function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}
