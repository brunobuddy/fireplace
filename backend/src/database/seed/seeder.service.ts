import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Member } from '../../family/entities/member.entity';
import { GroceryList } from '../../groceries/entities/grocery-list.entity';
import { GroceryCategory } from '../../groceries/entities/grocery-category.entity';
import { Todo } from '../../todos/entities/todo.entity';
import { TodoComment } from '../../todos/entities/todo-comment.entity';
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
    @InjectRepository(Todo)
    private readonly todos: Repository<Todo>,
    @InjectRepository(TodoComment)
    private readonly todoComments: Repository<TodoComment>,
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
    const members = await this.members.save([
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
    await this.seedDemoTodos(family, members);
    this.logger.log(`Seeded demo family "${family.name}" (${family.id})`);
  }

  /** A handful of starter to-dos so the board has something to show. */
  private async seedDemoTodos(
    family: Family,
    members: Member[],
  ): Promise<void> {
    const [alex, sam, robin] = members;
    if (!alex || !sam || !robin) {
      return;
    }
    const dentist = await this.todos.save(
      this.todos.create({
        familyId: family.id,
        title: 'Book the dentist for Robin',
        criticality: 'high',
        createdById: sam.id,
      }),
    );
    await this.todos.save(
      this.todos.create({
        familyId: family.id,
        title: 'Plan the weekend hike',
        description: 'Check the forecast and pack snacks for everyone.',
        criticality: 'medium',
        createdById: alex.id,
      }),
    );
    await this.todos.save(
      this.todos.create({
        familyId: family.id,
        title: 'Water the plants',
        criticality: 'low',
        createdById: robin.id,
      }),
    );
    await this.todoComments.save(
      this.todoComments.create({
        todoId: dentist.id,
        authorId: alex.id,
        body: 'I can drop them off Tuesday morning 🦷',
      }),
    );
  }
}
