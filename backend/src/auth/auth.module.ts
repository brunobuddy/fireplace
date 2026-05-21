import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EnvUserStore } from './users/env-user.store';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/** Insecure secret used only outside production when JWT_SECRET is unset. */
const DEV_SECRET = 'fireplace-dev-secret-change-me';

/**
 * App-level authentication. Login users come from `AUTH_USERS`; access is
 * gated globally by JwtAuthGuard (APP_GUARD) and opened per route with
 * `@Public()`. AuthService is exported so the websocket gateway can verify
 * tokens on connect.
 */
@Module({
  imports: [
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
