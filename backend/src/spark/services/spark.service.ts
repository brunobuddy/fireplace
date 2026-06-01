import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Member } from '../../family/entities/member.entity';
import { SparkQuestion } from '../entities/spark-question.entity';
import {
  ISparkRepository,
  SPARK_REPOSITORY,
} from '../repositories/spark.repository';
import {
  IQuestionGenerator,
  QUESTION_GENERATOR,
} from '../generator/question-generator';
import { SparkGateway } from '../gateways/spark.gateway';
import { AnswerSparkDto } from '../dto/answer-spark.dto';
import {
  SparkView,
  buildSparkView,
  summarizeAnswers,
  toIso,
} from '../spark.view';

/** How many recent questions to show the generator so it avoids repeats. */
const RECENT_LIMIT = 8;

/**
 * Orchestrates the daily Spark question for a family's two parents:
 * - `getView`   — the redacted, member-specific snapshot.
 * - `answer`    — record one parent's secret answer (gated to parents, locked
 *                  once both have answered).
 * - `regenerate`— archive the current question and generate a fresh one.
 * - `rolloverAllFamilies` — the cron entry point.
 *
 * Participants are the members with role `parent`; "revealed" means both have
 * answered (see {@link summarizeAnswers}).
 */
@Injectable()
export class SparkService {
  private readonly logger = new Logger(SparkService.name);

  constructor(
    @Inject(SPARK_REPOSITORY)
    private readonly spark: ISparkRepository,
    @Inject(QUESTION_GENERATOR)
    private readonly generator: IQuestionGenerator,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly gateway: SparkGateway,
  ) {}

  async getView(familyId: string, viewerMemberId: string): Promise<SparkView> {
    await this.requireFamily(familyId);
    const question = await this.spark.findActiveQuestion(familyId);
    const participants = await this.participantsOf(familyId);
    const answers = question ? await this.spark.findAnswers(question.id) : [];
    return buildSparkView(question, answers, participants, viewerMemberId);
  }

  async answer(familyId: string, dto: AnswerSparkDto): Promise<SparkView> {
    const question = await this.requireActiveQuestion(familyId);
    const participants = await this.participantsOf(familyId);
    if (!participants.some((p) => p.id === dto.memberId)) {
      throw new ForbiddenException(
        'Only the two parents can answer the Spark question',
      );
    }

    const existing = await this.spark.findAnswers(question.id);
    if (summarizeAnswers(existing, participants).revealed) {
      throw new ForbiddenException(
        'Both answers are already in — this question is locked',
      );
    }

    await this.spark.upsertAnswer({
      questionId: question.id,
      memberId: dto.memberId,
      text: dto.text.trim(),
    });

    const answers = await this.spark.findAnswers(question.id);
    const { answeredMemberIds, revealed } = summarizeAnswers(
      answers,
      participants,
    );
    this.gateway.emitUpdated({
      familyId,
      questionId: question.id,
      answeredMemberIds,
      revealed,
    });
    return buildSparkView(question, answers, participants, dto.memberId);
  }

  async regenerate(
    familyId: string,
    viewerMemberId?: string,
  ): Promise<SparkView> {
    await this.requireFamily(familyId);
    const question = await this.createQuestion(familyId);
    const participants = await this.participantsOf(familyId);
    this.gateway.emitQuestion({
      familyId,
      question: {
        id: question.id,
        text: question.text,
        createdAt: toIso(question.createdAt),
      },
    });
    return buildSparkView(question, [], participants, viewerMemberId);
  }

  /** Cron entry point: roll over every family whose question is fully answered. */
  async rolloverAllFamilies(): Promise<void> {
    const families = await this.families.find();
    for (const family of families) {
      try {
        await this.rolloverFamily(family.id);
      } catch (error) {
        this.logger.error(
          `Spark rollover failed for family ${family.id}: ${describe(error)}`,
        );
      }
    }
  }

  private async rolloverFamily(familyId: string): Promise<void> {
    const question = await this.spark.findActiveQuestion(familyId);
    if (question) {
      const participants = await this.participantsOf(familyId);
      const answers = await this.spark.findAnswers(question.id);
      if (!summarizeAnswers(answers, participants).revealed) {
        return; // still waiting on a parent — leave today's question up
      }
    }
    await this.regenerate(familyId);
    this.logger.log(`Rolled the Spark question over for family ${familyId}`);
  }

  private async createQuestion(familyId: string): Promise<SparkQuestion> {
    const recent = await this.spark.recentQuestionTexts(familyId, RECENT_LIMIT);
    const text = await this.generator.generate({ recent });
    await this.spark.archiveActiveQuestions(familyId);
    return this.spark.createQuestion({ familyId, text, source: 'manifest' });
  }

  private participantsOf(familyId: string): Promise<Member[]> {
    return this.members.find({
      where: { familyId, role: 'parent' },
      order: { createdAt: 'ASC' },
    });
  }

  private async requireFamily(familyId: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException(`Family ${familyId} not found`);
    }
    return family;
  }

  private async requireActiveQuestion(
    familyId: string,
  ): Promise<SparkQuestion> {
    await this.requireFamily(familyId);
    const question = await this.spark.findActiveQuestion(familyId);
    if (!question) {
      throw new NotFoundException(
        'No active Spark question yet — generate one first',
      );
    }
    return question;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
