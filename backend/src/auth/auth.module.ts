import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { FamilyModule } from '../family/family.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EnvUserStore } from './users/env-user.store';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Insecure secret used only outside production when JWT_SECRET is unset. */
const DEV_SECRET = 'fireplace-dev-secret-change-me';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Effectively unlimited: e2e suites log in repeatedly and are not the subject. */
const TEST_LIMIT = 1_000_000;

/**
 * App-level authentication. Login users come from `AUTH_USERS`; access is
 * gated globally by JwtAuthGuard (APP_GUARD) and opened per route with
 * `@Public()`. AuthService is exported so the websocket gateway can verify
 * tokens on connect. FamilyModule is imported so AuthService can resolve the
 * signed-in email to its `Member` row (the JWT carries the member profile).
 *
 * ThrottlerModule is registered here rather than in `app.module` because login
 * is the only throttled route — the module is `@Global()`, so the storage it
 * provides is still reachable from `LoginThrottlerGuard`.
 */
@Module({
  imports: [
    FamilyModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveSecret(config),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d',
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: resolveThrottlers,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EnvUserStore,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

function resolveSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (secret) {
    return secret;
  }
  if (config.get('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  new Logger('AuthModule').warn(
    'JWT_SECRET not set — using an insecure development secret.',
  );
  return DEV_SECRET;
}

/**
 * Two buckets, both keyed per (IP, email) by `LoginThrottlerGuard`:
 *
 *   • burst — 5 tries a minute, then a 15-minute lockout (Android's own shape).
 *   • daily — 20 tries a day, which puts even the ~1,000 patterns humans
 *     actually choose ~50 days out of reach.
 *
 * Generous by default under `NODE_ENV=test` so the other e2e suites, which log
 * in freely, are not the ones being rate-limited.
 */
function resolveThrottlers(config: ConfigService): ThrottlerModuleOptions {
  const isTest = config.get('NODE_ENV') === 'test';
  return [
    {
      name: 'login-burst',
      ttl: readPositiveNumber(config, 'LOGIN_WINDOW_MS', MINUTE),
      limit: readPositiveNumber(
        config,
        'LOGIN_MAX_ATTEMPTS',
        isTest ? TEST_LIMIT : 5,
      ),
      blockDuration: readPositiveNumber(config, 'LOGIN_BLOCK_MS', 15 * MINUTE),
    },
    {
      name: 'login-daily',
      ttl: DAY,
      limit: readPositiveNumber(
        config,
        'LOGIN_DAILY_MAX_ATTEMPTS',
        isTest ? TEST_LIMIT : 20,
      ),
    },
  ];
}

function readPositiveNumber(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = config.get<string>(key)?.trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
