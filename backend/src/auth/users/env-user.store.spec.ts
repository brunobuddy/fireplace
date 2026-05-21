import { ConfigService } from '@nestjs/config';
import { EnvUserStore, parseUsers } from './env-user.store';

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

describe('EnvUserStore', () => {
  it('finds a configured user case-insensitively', () => {
    const store = new EnvUserStore(configWith({ AUTH_USERS: 'a@x.io:pw' }));
    expect(store.findByEmail('A@X.io')?.secret).toBe('pw');
    expect(store.findByEmail('missing@x.io')).toBeUndefined();
  });

  it('falls back to a dev user outside production when AUTH_USERS is unset', () => {
    const store = new EnvUserStore(configWith({ NODE_ENV: 'development' }));
    expect(store.size).toBe(1);
    expect(store.findByEmail('demo@fireplace.app')).toBeDefined();
  });

  it('has no users in production when AUTH_USERS is unset (fail-closed)', () => {
    const store = new EnvUserStore(configWith({ NODE_ENV: 'production' }));
    expect(store.size).toBe(0);
  });
});
