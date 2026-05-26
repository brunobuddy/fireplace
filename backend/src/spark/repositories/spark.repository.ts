import {
  SparkQuestion,
  SparkQuestionSource,
} from '../entities/spark-question.entity';
import { SparkAnswer } from '../entities/spark-answer.entity';

export const SPARK_REPOSITORY = Symbol('SPARK_REPOSITORY');

export interface NewSparkQuestion {
  familyId: string;
  text: string;
  source: SparkQuestionSource;
}

export interface NewSparkAnswer {
  questionId: string;
  memberId: string;
  text: string;
}

/**
 * Persistence port for the Spark aggregate (the active question plus the two
 * secret answers). Bound to a TypeORM adapter in the module — swap it or fake
 * it in tests with a one-line change (Dependency Inversion).
 */
export interface ISparkRepository {
  /** The family's current question, or null if none has been created yet. */
  findActiveQuestion(familyId: string): Promise<SparkQuestion | null>;
  /** Most recent question texts (newest first) — fed to the generator to avoid repeats. */
  recentQuestionTexts(familyId: string, limit: number): Promise<string[]>;
  createQuestion(data: NewSparkQuestion): Promise<SparkQuestion>;
  /** Mark every still-active question for the family as archived. */
  archiveActiveQuestions(familyId: string): Promise<void>;
  /** Answers for a question, each with its `member` stamp loaded. */
  findAnswers(questionId: string): Promise<SparkAnswer[]>;
  /** Insert or update this member's answer (one per member per question). */
  upsertAnswer(data: NewSparkAnswer): Promise<SparkAnswer>;
}
