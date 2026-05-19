import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { FamilyService } from './family.service';
import { Family } from './entities/family.entity';
import { Member } from './entities/member.entity';

@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  findAll(): Promise<Family[]> {
    return this.familyService.findAllFamilies();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Family> {
    return this.familyService.findFamily(id);
  }

  @Get(':id/members')
  findMembers(@Param('id', ParseUUIDPipe) id: string): Promise<Member[]> {
    return this.familyService.findMembers(id);
  }
}
