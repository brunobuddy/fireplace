import { Controller, Get } from '@nestjs/common';

/** Liveness probe consumed by Docker HEALTHCHECK and Railway. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'fireplace-api' };
  }
}
