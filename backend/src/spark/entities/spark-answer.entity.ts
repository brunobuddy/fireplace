import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from '../../family/entities/member.entity';
import { SparkQuestion } from './spark-question.entity';

/**
 * One parent's secret answer to a Spark question. The unique
 * `(questionId, memberId)` index enforces one answer per member per question —
 * re-answering before the reveal upserts this row. `member` is the "who
 * answered" stamp, consistent with the rest of the family domain.
 */
@Entity('spark_answers')
@Index(['questionId', 'memberId'], { unique: true })
export class SparkAnswer extends BaseEntity {
  @Column({ type: 'varchar', length: 2000 })
  text!: string;

  @Column({ type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => SparkQuestion, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question!: SparkQuestion;

  @Column({ type: 'uuid' })
  memberId!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: Member;
}
