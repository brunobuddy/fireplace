import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Family } from '../family/entities/family.entity';
import { EntranceMessage } from './entities/entrance-message.entity';
import { EntranceMessageService } from './services/entrance-message.service';
import { DeviceEntranceMessageService } from './services/device-entrance-message.service';
import { EntranceMessageController } from './controllers/entrance-message.controller';
import { DeviceEntranceMessageController } from './controllers/device-entrance-message.controller';
import { EntranceMessageGateway } from './gateways/entrance-message.gateway';
import { ENTRANCE_MESSAGE_REPOSITORY } from './repositories/entrance-message.repository';
import { TypeOrmEntranceMessageRepository } from './repositories/typeorm-entrance-message.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntranceMessage, Family]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [EntranceMessageController, DeviceEntranceMessageController],
  providers: [
    EntranceMessageService,
    DeviceEntranceMessageService,
    EntranceMessageGateway,
    {
      provide: ENTRANCE_MESSAGE_REPOSITORY,
      useClass: TypeOrmEntranceMessageRepository,
    },
  ],
  exports: [EntranceMessageService],
})
export class EntranceMessageModule {}
