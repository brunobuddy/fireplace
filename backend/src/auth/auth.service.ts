import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { EnvUserStore } from './users/env-user.store';
import { AuthUser, JwtPayload } from './auth.types';

/** A stored secret beginning like this is treated as a bcrypt hash. */
const BCRYPT_PREFIX = /^\$2[aby]\$/;

/**
 * Validates credentials against the env-backed user directory and mints /
 * verifies JWTs. Passwords are checked in constant time (plaintext) or with
 * bcrypt when the stored secret is a hash, so neither path leaks timing.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: EnvUserStore,
    private readonly jwt: JwtService,
  ) {}

  /** Returns the user on a correct email + password, otherwise null. */
  validateUser(email: string, password: string): AuthUser | null {
    const record = this.users.findByEmail(email);
    if (!record) {
      return null;
    }
    const ok = BCRYPT_PREFIX.test(record.secret)
      ? compareSync(password, record.secret)
      : constantTimeEqual(password, record.secret);
    return ok ? { email: record.email } : null;
  }

  /** Authenticates and returns a signed token. Throws 401 on bad creds. */
  login(email: string, password: string): { token: string; user: AuthUser } {
    const user = this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = { sub: user.email, email: user.email };
    return { token: this.jwt.sign(payload), user };
  }

  /** Verifies a token (HTTP or websocket) and returns the user. Throws if invalid. */
  verify(token: string): AuthUser {
    const payload = this.jwt.verify<JwtPayload>(token);
    return { email: payload.email };
  }
}

/** Length-safe, constant-time comparison via fixed-size SHA-256 digests. */
function constantTimeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}
