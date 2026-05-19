import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from './entities/family.entity';
import { Member } from './entities/member.entity';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Family, Member])],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService, TypeOrmModule],
})
export class FamilyModule {}
