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
import { Member } from '../../family/entities/member.entity';
import { TodoComment } from './todo-comment.entity';

export type TodoCriticality = 'low' | 'medium' | 'high';
export type TodoStatus = 'open' | 'done';

/**
 * A family to-do. Criticality drives the on-screen grouping; the member
 * stamps (`createdBy` / `completedBy`) answer "who added / finished this".
 * `completedAt` is stored as an ISO string (varchar) on purpose — the same
 * cross-driver-safe approach the groceries entities use for enums, so the
 * in-memory SQLite test DB and Postgres agree without pg-only column types.
 */
@Entity('todos')
export class Todo extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  criticality!: TodoCriticality;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: TodoStatus;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family!: Family;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Member;

  @Column({ type: 'uuid', nullable: true })
  completedById!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completedById' })
  completedBy!: Member | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  completedAt!: string | null;

  @OneToMany(() => TodoComment, (comment) => comment.todo, { cascade: true })
  comments!: TodoComment[];
}
