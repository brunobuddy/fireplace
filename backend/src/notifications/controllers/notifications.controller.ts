import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import {
  RemoveSubscriptionDto,
  SaveSubscriptionDto,
} from '../dto/save-subscription.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

/**
 * Push subscription lifecycle. Everything is bound to the signed-in member —
 * the JWT says who owns the device, never the request body.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('public-key')
  publicKey(): { publicKey: string | null } {
    return this.notifications.getPublicKey();
  }

  @Post('subscription')
  @HttpCode(204)
  async subscribe(
    @Body() dto: SaveSubscriptionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.notifications.saveSubscription(
      user.memberId,
      user.familyId,
      dto,
    );
  }

  @Delete('subscription')
  @HttpCode(204)
  async unsubscribe(
    @Body() dto: RemoveSubscriptionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.notifications.removeSubscription(user.memberId, dto.endpoint);
  }
}
