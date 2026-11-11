import {
  Controller,
  Get,
  Headers,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { DeviceEntranceMessageService } from '../services/device-entrance-message.service';

/**
 * Plain-text, read-only feed for the entrance screen. `@Public()` only lifts
 * the JWT guard — the device token is checked here instead. 204 when there is
 * nothing to show; see `formatForDevice` for the body format.
 */
@Controller('device/entrance-message')
export class DeviceEntranceMessageController {
  constructor(private readonly device: DeviceEntranceMessageService) {}

  @Public()
  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.device.isAuthorized(authorization)) {
      throw new UnauthorizedException('Jeton d’appareil invalide');
    }
    const body = await this.device.render();
    res.setHeader('Cache-Control', 'no-store');
    if (body === null) {
      res.status(204).end();
      return;
    }
    res.status(200).type('text/plain; charset=utf-8').send(body);
  }
}
