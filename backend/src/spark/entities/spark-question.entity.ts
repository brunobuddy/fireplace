import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Family } from '../../family/entities/family.entity';
import { SparkAnswer } from './spark-answer.entity';

export type SparkQuestionStatus = 'active' | 'archived';
/** Where the question came from — `seed` for the bootstrap one, `openai` for generated. */
export type SparkQuestionSource = 'openai' | 'seed';

/**
 * A daily bonding question for the family's two parents. Exactly one question
 * per family is `active` at a time (the service archives the old one when a
 * new one is generated). `text` is public — only the *answers* are secret.
 * Varchar columns (no pg-only enum types) keep the SQLite test DB and Postgres
 * in agreement, the same approach the to-do/grocery entities take.
 */
@Entity('spark_questions')
export class SparkQuestion extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  text!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: SparkQuestionStatus;

  @Column({ type: 'varchar', length: 16, default: 'openai' })
  source!: SparkQuestionSource;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family!: Family;

  @OneToMany(() => SparkAnswer, (answer) => answer.question, { cascade: true })
  answers!: SparkAnswer[];
}
