import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Member } from '../../family/entities/member.entity';
import { GroceryList } from '../../groceries/entities/grocery-list.entity';
import { GroceryCategory } from '../../groceries/entities/grocery-category.entity';
import { CATEGORY_SEED } from './categories.seed';

/**
 * Makes the app usable the instant it boots: ensures the aisle catalogue
 * exists and, on a fresh database, creates one demo family so the profile
 * switcher and the grocery list have something to show. Fully idempotent.
 */
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(GroceryCategory)
    private readonly categories: Repository<GroceryCategory>,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
    @InjectRepository(GroceryList)
    private readonly lists: Repository<GroceryList>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategories();
    await this.seedDemoFamily();
  }

  private async seedCategories(): Promise<void> {
    for (const seed of CATEGORY_SEED) {
      const exists = await this.categories.findOne({
        where: { slug: seed.slug },
      });
      if (!exists) {
        await this.categories.save(this.categories.create(seed));
      }
    }
  }

  private async seedDemoFamily(): Promise<void> {
    if ((await this.families.count()) > 0) {
      return;
    }
    const family = await this.families.save(
      this.families.create({ name: 'The Sample Family' }),
    );
    await this.members.save([
      this.members.create({
        familyId: family.id,
        name: 'Alex',
        role: 'parent',
        color: '#6366f1',
      }),
      this.members.create({
        familyId: family.id,
        name: 'Sam',
        role: 'parent',
        color: '#ec4899',
      }),
      this.members.create({
        familyId: family.id,
        name: 'Robin',
        role: 'child',
        color: '#22c55e',
      }),
    ]);
    await this.lists.save(
      this.lists.create({ familyId: family.id, name: 'Shopping list' }),
    );
    this.logger.log(`Seeded demo family "${family.name}" (${family.id})`);
  }
}
