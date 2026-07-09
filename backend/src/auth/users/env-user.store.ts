import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialRecord } from '../auth.types';

/**
 * The unlock pattern behind the dev logins — down the left column, across the
 * bottom, up the right column:
 *
 *     0 . 2
 *     3 . 5      0 -> 3 -> 6 -> 7 -> 8 -> 5 -> 2
 *     6 7 8
 */
export const DEV_FALLBACK_PATTERN = '0367852';

/**
 * Insecure defaults so `npm run dev` works with no setup. There are *two*
 * entries because the seeder maps the first onto Bruno and the second onto
 * Audrey: with a single entry it seeds neither member, and every login then
 * dies at the member lookup rather than at the credential check.
 */
const DEV_FALLBACK = `bruno@fireplace.local:${DEV_FALLBACK_PATTERN},audrey@fireplace.local:${DEV_FALLBACK_PATTERN}`;

/**
 * The credential directory in effect. Production fails closed on a missing
 * `AUTH_USERS`; everywhere else the dev logins stand in. The seeder shares this
 * so the members it creates always match the logins that exist.
 */
export function resolveUsers(
  raw: string | undefined,
  isProduction: boolean,
): CredentialRecord[] {
  const trimmed = raw?.trim();
  if (trimmed) {
    return parseUsers(trimmed);
  }
  return isProduction ? [] : parseUsers(DEV_FALLBACK);
}

/**
 * The app's user directory, sourced from the `AUTH_USERS` env var.
 * Format: comma-separated `email:secret` entries, where `secret` is an unlock
 * pattern in plaintext or — preferably — its bcrypt hash (the AuthService picks
 * the comparison).
 *
 * This is the single seam for "who can log in" — swap it for a DB-backed
 * store later without touching the rest of auth (Dependency Inversion).
 */
@Injectable()
export class EnvUserStore {
  private readonly logger = new Logger(EnvUserStore.name);
  private readonly users: CredentialRecord[];

  constructor(config: ConfigService) {
    const raw = config.get<string>('AUTH_USERS')?.trim();
    const isProd = config.get('NODE_ENV') === 'production';
    this.users = resolveUsers(raw, isProd);

    if (!raw) {
      if (isProd) {
        this.logger.error(
          'AUTH_USERS is not set — nobody can log in. Set it to "email:secret,…".',
        );
        return;
      }
      const emails = this.users.map((user) => user.email).join(', ');
      this.logger.warn(
        `AUTH_USERS not set — using insecure dev logins (${emails}) with pattern ${DEV_FALLBACK_PATTERN}. Set AUTH_USERS for real use.`,
      );
      return;
    }

    if (this.users.length === 0) {
      this.logger.error(
        'AUTH_USERS is set but no valid "email:secret" entries were parsed.',
      );
    }
  }

  /** Look up a credential by email (case-insensitive). */
  findByEmail(email: string): CredentialRecord | undefined {
    const needle = email.trim().toLowerCase();
    return this.users.find((user) => user.email === needle);
  }

  /** Number of configured users (used by tests / diagnostics). */
  get size(): number {
    return this.users.length;
  }
}

/**
 * Parse `email:secret,email:secret` into records. Emails are lowercased; the
 * first colon separates email from secret (bcrypt hashes and unlock patterns
 * both contain no colon). Malformed entries are skipped.
 */
export function parseUsers(raw: string): CredentialRecord[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry): CredentialRecord | null => {
      const idx = entry.indexOf(':');
      if (idx <= 0) {
        return null;
      }
      const email = entry.slice(0, idx).trim().toLowerCase();
      const secret = entry.slice(idx + 1).trim();
      return email && secret ? { email, secret } : null;
    })
    .filter((user): user is CredentialRecord => user !== null);
}
