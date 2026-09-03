import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Family } from '../family/entities/family.entity';
import { LostObject } from './entities/lost-object.entity';
import { LostObjectComment } from './entities/lost-object-comment.entity';
import { LostObjectsService } from './services/lost-objects.service';
import { LostObjectsController } from './controllers/lost-objects.controller';
import { LostObjectsGateway } from './gateways/lost-objects.gateway';
import { LOST_OBJECT_REPOSITORY } from './repositories/lost-object.repository';
import { TypeOrmLostObjectRepository } from './repositories/typeorm-lost-object.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([LostObject, LostObjectComment, Family]),
    AuthModule,
  ],
  controllers: [LostObjectsController],
  providers: [
    LostObjectsService,
    LostObjectsGateway,
    {
      provide: LOST_OBJECT_REPOSITORY,
      useClass: TypeOrmLostObjectRepository,
    },
  ],
  exports: [LostObjectsService],
})
export class LostObjectsModule {}
