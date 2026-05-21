import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

/** Liveness probe consumed by Docker HEALTHCHECK and Railway. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'fireplace-api' };
  }
}
