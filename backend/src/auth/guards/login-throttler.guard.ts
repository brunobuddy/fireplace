import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Bounds login attempts, bucketed per (client IP, email) rather than per IP.
 *
 * An unlock pattern is only ~18.5 bits — the whole 380,336-pattern space is a
 * few hours of unthrottled bcrypt, and the handful of patterns humans actually
 * pick fall in minutes. Throttling, not grid geometry, is what keeps the secret
 * out of reach.
 *
 * Folding the email into the key means one attacker cannot lock the household
 * out by hammering a single address from one IP, while attempts against any one
 * account stay bounded. It does not stop a *distributed* guess — for that you
 * would need an email-only counter, which just hands the attacker a denial of
 * service against the real user instead.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' && req.ip ? req.ip : 'unknown-ip';
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string'
        ? body.email.trim().toLowerCase()
        : 'unknown-email';
    return Promise.resolve(`${ip}|${email}`);
  }
}
