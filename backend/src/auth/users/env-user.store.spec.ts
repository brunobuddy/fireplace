import { ConfigService } from '@nestjs/config';
import { isValidPattern } from '../pattern';
import {
  DEV_FALLBACK_PATTERN,
  EnvUserStore,
  parseUsers,
  resolveUsers,
} from './env-user.store';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('parseUsers', () => {
  it('parses comma-separated email:secret pairs, lowercasing emails', () => {
    expect(parseUsers('Alex@Fireplace.app:pw1, sam@fireplace.app:pw2')).toEqual(
      [
        { email: 'alex@fireplace.app', secret: 'pw1' },
        { email: 'sam@fireplace.app', secret: 'pw2' },
      ],
    );
  });

  it('splits only on the first colon, keeping bcrypt hashes intact', () => {
    const hash = '$2a$10$abcdefghijklmnopqrstuv';
    const [user] = parseUsers(`u@x.io:${hash}`);
    expect(user).toEqual({ email: 'u@x.io', secret: hash });
  });

  it('skips malformed entries', () => {
    expect(parseUsers('no-colon, :nopass, user@x.io:, ,good@x.io:pw')).toEqual([
      { email: 'good@x.io', secret: 'pw' },
    ]);
  });
});

describe('resolveUsers', () => {
  it('prefers AUTH_USERS wherever it is set', () => {
    expect(resolveUsers('a@x.io:012587', false)).toEqual([
      { email: 'a@x.io', secret: '012587' },
    ]);
    expect(resolveUsers('a@x.io:012587', true)).toHaveLength(1);
  });

  it('fails closed in production when AUTH_USERS is unset or blank', () => {
    expect(resolveUsers(undefined, true)).toEqual([]);
    expect(resolveUsers('   ', true)).toEqual([]);
  });

  it('yields two dev logins outside production, one per seeded parent', () => {
    // The seeder maps the first entry onto Bruno and the second onto Audrey and
    // skips the household entirely with fewer than two — so a single-entry
    // fallback would leave the dev login with no member row to resolve to.
    const users = resolveUsers(undefined, false);
    expect(users.map((user) => user.email)).toEqual([
      'bruno@fireplace.local',
      'audrey@fireplace.local',
    ]);
  });

  it('uses a dev secret the login form can actually submit', () => {
    // The DTO rejects anything that is not a traceable walk, so a fallback
    // secret like "demo" would be unreachable through the UI.
    expect(isValidPattern(DEV_FALLBACK_PATTERN)).toBe(true);
    for (const user of resolveUsers(undefined, false)) {
      expect(user.secret).toBe(DEV_FALLBACK_PATTERN);
    }
  });
});

describe('EnvUserStore', () => {
  it('finds a configured user case-insensitively', () => {
    const store = new EnvUserStore(configWith({ AUTH_USERS: 'a@x.io:pw' }));
    expect(store.findByEmail('A@X.io')?.secret).toBe('pw');
    expect(store.findByEmail('missing@x.io')).toBeUndefined();
  });

  it('falls back to the dev users outside production when AUTH_USERS is unset', () => {
    const store = new EnvUserStore(configWith({ NODE_ENV: 'development' }));
    expect(store.size).toBe(2);
    expect(store.findByEmail('bruno@fireplace.local')).toBeDefined();
    expect(store.findByEmail('audrey@fireplace.local')).toBeDefined();
  });

  it('has no users in production when AUTH_USERS is unset (fail-closed)', () => {
    const store = new EnvUserStore(configWith({ NODE_ENV: 'production' }));
    expect(store.size).toBe(0);
  });
});
