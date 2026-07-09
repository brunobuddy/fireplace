import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Member } from '../../family/entities/member.entity';
import { GroceryList } from '../../groceries/entities/grocery-list.entity';
import { GroceryCategory } from '../../groceries/entities/grocery-category.entity';
import { SparkQuestion } from '../../spark/entities/spark-question.entity';
import { resolveUsers } from '../../auth/users/env-user.store';
import { CATEGORY_SEED } from './categories.seed';

/**
 * Hardcoded family shape. Names are baked in (the app is built for one
 * household with two parents); emails come from AUTH_USERS at runtime so they
 * stay out of source control. First AUTH_USERS entry → Bruno, second → Audrey.
 */
const FAMILY_NAME = 'Home';
const PARENTS = [
  { name: 'Bruno', color: '#c2410c' },
  { name: 'Audrey', color: '#d97706' },
] as const;

const STARTER_SPARK_QUESTION =
  'Si on pouvait planifier une petite aventure ensemble ce mois-ci, ce serait laquelle ?';

/**
 * Makes the app usable the instant it boots:
 *   • ensures the aisle catalogue exists,
 *   • reconciles the single family + its two parents (Bruno, Audrey) with the
 *     emails currently in AUTH_USERS — runs every boot so rotating an email in
 *     Railway propagates without a DB wipe,
 *   • ensures a starter Spark question is up so the page works before the
 *     first OpenAI call.
 *
 * Fully idempotent.
 */
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GroceryCategory)
    private readonly categories: Repository<GroceryCategory>,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
    @InjectRepository(GroceryList)
    private readonly lists: Repository<GroceryList>,
    @InjectRepository(SparkQuestion)
    private readonly sparkQuestions: Repository<SparkQuestion>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategories();
    await this.reconcileHousehold();
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

  private async reconcileHousehold(): Promise<void> {
    const emails = this.readAuthEmails();
    if (emails.length < PARENTS.length) {
      this.logger.warn(
        `AUTH_USERS has ${emails.length} entries — expected at least ${PARENTS.length} (first → Bruno, second → Audrey). Skipping household seed.`,
      );
      return;
    }

    const family = await this.ensureFamily();
    await Promise.all(
      PARENTS.map((parent, index) =>
        this.ensureParent(family.id, parent.name, emails[index], parent.color),
      ),
    );
    await this.ensureDefaultList(family.id);
    await this.ensureStarterSparkQuestion(family.id);
  }

  /**
   * Resolved through the same helper the credential store uses, so the dev
   * fallback seeds the very members it lets you log in as. Reading `AUTH_USERS`
   * directly used to leave the fallback login with no member row at all.
   */
  private readAuthEmails(): string[] {
    return resolveUsers(
      this.config.get<string>('AUTH_USERS'),
      this.config.get('NODE_ENV') === 'production',
    ).map((entry) => entry.email);
  }

  private async ensureFamily(): Promise<Family> {
    const existing = await this.families.findOne({
      where: { name: FAMILY_NAME },
    });
    if (existing) {
      return existing;
    }
    const created = await this.families.save(
      this.families.create({ name: FAMILY_NAME }),
    );
    this.logger.log(`Seeded family "${created.name}" (${created.id})`);
    return created;
  }

  private async ensureParent(
    familyId: string,
    name: string,
    email: string,
    color: string,
  ): Promise<void> {
    const existing = await this.members.findOne({ where: { familyId, name } });
    if (!existing) {
      await this.members.save(
        this.members.create({
          familyId,
          name,
          email,
          role: 'parent',
          color,
        }),
      );
      this.logger.log(`Seeded member "${name}" (${email})`);
      return;
    }
    const drift =
      existing.email !== email ||
      existing.role !== 'parent' ||
      existing.color !== color;
    if (drift) {
      existing.email = email;
      existing.role = 'parent';
      existing.color = color;
      await this.members.save(existing);
      this.logger.log(`Reconciled member "${name}" (${email})`);
    }
  }

  private async ensureDefaultList(familyId: string): Promise<void> {
    const existing = await this.lists.findOne({ where: { familyId } });
    if (existing) {
      return;
    }
    await this.lists.save(
      this.lists.create({ familyId, name: 'Liste de courses' }),
    );
  }

  /**
   * One starter Spark question so the page works the moment the app boots —
   * before any OpenAI call. Marked `source: 'seed'`; the next rollover (cron or
   * the "✨ New question" button) replaces it with a generated one.
   */
  private async ensureStarterSparkQuestion(familyId: string): Promise<void> {
    const hasActive = await this.sparkQuestions.findOne({
      where: { familyId, status: 'active' },
    });
    if (hasActive) {
      return;
    }
    await this.sparkQuestions.save(
      this.sparkQuestions.create({
        familyId,
        text: STARTER_SPARK_QUESTION,
        status: 'active',
        source: 'seed',
      }),
    );
  }
}
