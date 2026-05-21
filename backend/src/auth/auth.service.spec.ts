import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';
import { EnvUserStore } from './users/env-user.store';
import { CredentialRecord } from './auth.types';

/** Minimal EnvUserStore stub that mirrors the real case-insensitive lookup. */
function storeWith(records: CredentialRecord[]): EnvUserStore {
  return {
    findByEmail: (email: string) =>
      records.find((r) => r.email === email.trim().toLowerCase()),
  } as EnvUserStore;
}

describe('AuthService', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1h' },
  });

  it('validates a correct plaintext password (case-insensitive email)', () => {
    const svc = new AuthService(
      storeWith([{ email: 'a@x.io', secret: 'pw' }]),
      jwt,
    );
    expect(svc.validateUser('a@x.io', 'pw')).toEqual({ email: 'a@x.io' });
    expect(svc.validateUser('A@X.io', 'pw')).toEqual({ email: 'a@x.io' });
    expect(svc.validateUser('a@x.io', 'wrong')).toBeNull();
    expect(svc.validateUser('missing@x.io', 'pw')).toBeNull();
  });

  it('validates a bcrypt-hashed password', () => {
    const svc = new AuthService(
      storeWith([{ email: 'a@x.io', secret: hashSync('secret', 10) }]),
      jwt,
    );
    expect(svc.validateUser('a@x.io', 'secret')).toEqual({ email: 'a@x.io' });
    expect(svc.validateUser('a@x.io', 'nope')).toBeNull();
  });

  it('issues a token that verifies back to the user', () => {
    const svc = new AuthService(
      storeWith([{ email: 'a@x.io', secret: 'pw' }]),
      jwt,
    );
    const { token, user } = svc.login('a@x.io', 'pw');
    expect(user).toEqual({ email: 'a@x.io' });
    expect(svc.verify(token)).toEqual({ email: 'a@x.io' });
    expect(jwt.verify(token)).toMatchObject({ sub: 'a@x.io', email: 'a@x.io' });
  });

  it('throws a generic 401 on bad credentials', () => {
    const svc = new AuthService(
      storeWith([{ email: 'a@x.io', secret: 'pw' }]),
      jwt,
    );
    expect(() => svc.login('a@x.io', 'wrong')).toThrow(UnauthorizedException);
    expect(() => svc.login('a@x.io', 'wrong')).toThrow(
      'Invalid email or password',
    );
  });

  it('rejects a token signed with a different secret', () => {
    const svc = new AuthService(storeWith([]), jwt);
    const foreign = new JwtService({ secret: 'other-secret' }).sign({
      sub: 'a@x.io',
      email: 'a@x.io',
    });
    expect(() => svc.verify(foreign)).toThrow();
  });
});
