import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from './entities/family.entity';
import { Member } from './entities/member.entity';

/**
 * Read-side access to families and their members. Kept intentionally small —
 * the profile switcher only needs to list families and their members.
 */
@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
  ) {}

  findAllFamilies(): Promise<Family[]> {
    return this.families.find({ order: { name: 'ASC' } });
  }

  async findFamily(id: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id } });
    if (!family) {
      throw new NotFoundException(`Famille ${id} introuvable`);
    }
    return family;
  }

  findMembers(familyId: string): Promise<Member[]> {
    return this.members.find({
      where: { familyId },
      order: { createdAt: 'ASC' },
    });
  }
}
