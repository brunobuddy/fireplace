import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialRecord } from '../auth.types';

/** Insecure default so local dev / `npm run dev` works with no setup. */
const DEV_FALLBACK = 'demo@fireplace.app:demo';

/**
 * The app's user directory, sourced from the `AUTH_USERS` env var.
 * Format: comma-separated `email:secret` entries, where `secret` is a
 * plaintext password or a bcrypt hash (the AuthService picks the comparison).
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

    if (!raw) {
      if (isProd) {
        this.logger.error(
          'AUTH_USERS is not set — nobody can log in. Set it to "email:password,…".',
        );
        this.users = [];
        return;
      }
      this.logger.warn(
        `AUTH_USERS not set — using insecure dev login "${DEV_FALLBACK}". Set AUTH_USERS for real use.`,
      );
      this.users = parseUsers(DEV_FALLBACK);
      return;
    }

    this.users = parseUsers(raw);
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
 * first colon separates email from secret (bcrypt hashes contain no colon).
 * Malformed entries are skipped.
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
