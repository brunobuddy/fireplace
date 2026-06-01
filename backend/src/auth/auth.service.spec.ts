import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { EnvUserStore } from './users/env-user.store';
import { CredentialRecord } from './auth.types';
import { Member } from '../family/entities/member.entity';

/** Minimal EnvUserStore stub mirroring the real case-insensitive lookup. */
function storeWith(records: CredentialRecord[]): EnvUserStore {
  return {
    findByEmail: (email: string) =>
      records.find((r) => r.email === email.trim().toLowerCase()),
  } as EnvUserStore;
}

/** Minimal Members repo stub — only `findOne` is used by AuthService. */
function membersWith(rows: Member[]): Repository<Member> {
  return {
    findOne: async ({ where }: { where: { email: string } }) =>
      rows.find((m) => m.email === where.email) ?? null,
  } as unknown as Repository<Member>;
}

const bruno: Member = {
  id: 'mem-bruno',
  familyId: 'fam-home',
  name: 'Bruno',
  email: 'bruno@x.io',
  role: 'parent',
  color: '#c2410c',
} as Member;

describe('AuthService', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1h' },
  });

  it('logs in with a correct plaintext password (case-insensitive email)', async () => {
    const svc = new AuthService(
      storeWith([{ email: 'bruno@x.io', secret: 'pw' }]),
      jwt,
      membersWith([bruno]),
    );
    const { user } = await svc.login('Bruno@X.io', 'pw');
    expect(user).toMatchObject({
      memberId: 'mem-bruno',
      familyId: 'fam-home',
      email: 'bruno@x.io',
      name: 'Bruno',
      role: 'parent',
    });
  });

  it('logs in with a bcrypt-hashed password', async () => {
    const svc = new AuthService(
      storeWith([{ email: 'bruno@x.io', secret: hashSync('secret', 10) }]),
      jwt,
      membersWith([bruno]),
    );
    const { user } = await svc.login('bruno@x.io', 'secret');
    expect(user.memberId).toBe('mem-bruno');
    await expect(svc.login('bruno@x.io', 'nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('issues a token that verifies back to the same user', async () => {
    const svc = new AuthService(
      storeWith([{ email: 'bruno@x.io', secret: 'pw' }]),
      jwt,
      membersWith([bruno]),
    );
    const { token, user } = await svc.login('bruno@x.io', 'pw');
    expect(svc.verify(token)).toEqual(user);
    expect(jwt.verify(token)).toMatchObject({
      sub: 'mem-bruno',
      memberId: 'mem-bruno',
      familyId: 'fam-home',
      email: 'bruno@x.io',
      name: 'Bruno',
    });
  });

  it('throws a generic 401 on a wrong password', async () => {
    const svc = new AuthService(
      storeWith([{ email: 'bruno@x.io', secret: 'pw' }]),
      jwt,
      membersWith([bruno]),
    );
    await expect(svc.login('bruno@x.io', 'wrong')).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('refuses an email that has no member row yet', async () => {
    const svc = new AuthService(
      storeWith([{ email: 'ghost@x.io', secret: 'pw' }]),
      jwt,
      membersWith([bruno]),
    );
    await expect(svc.login('ghost@x.io', 'pw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with a different secret', () => {
    const svc = new AuthService(storeWith([]), jwt, membersWith([]));
    const foreign = new JwtService({ secret: 'other-secret' }).sign({
      sub: 'mem-bruno',
      memberId: 'mem-bruno',
      familyId: 'fam-home',
      email: 'bruno@x.io',
      name: 'Bruno',
      role: 'parent',
      color: '#c2410c',
    });
    expect(() => svc.verify(foreign)).toThrow();
  });
});
