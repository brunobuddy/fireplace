import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Member } from '../family/entities/member.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { PUSH_SENDER } from './sender/push-sender';
import { WebPushSender } from './sender/web-push-sender';
import { StubPushSender } from './sender/stub-push-sender';

/**
 * Web Push notifications. The delivery mechanism is a port (DIP): the real
 * adapter speaks VAPID via `web-push`; under NODE_ENV=test a recording stub
 * binds instead so suites never contact a push service. Feature modules
 * import this module and call `NotificationsService.notifyOthers`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, Member]), AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: PUSH_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        process.env.NODE_ENV === 'test'
          ? new StubPushSender()
          : new WebPushSender(config),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
