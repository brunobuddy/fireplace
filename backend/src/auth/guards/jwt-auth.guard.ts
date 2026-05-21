import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { AuthedRequest } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global guard (registered as APP_GUARD): every route needs a valid
 * `Authorization: Bearer <token>` unless explicitly marked `@Public()`.
 * Secure-by-default — new controllers are protected without extra wiring.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearer(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    try {
      request.user = this.auth.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

function extractBearer(header?: string): string | null {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(' ');
  return scheme === 'Bearer' && value ? value : null;
}
