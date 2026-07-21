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
import { ProjectTask } from './project-task.entity';

export type ProjectStatus = 'active' | 'archived';

/**
 * A family project — a named batch of tasks worked on together (redo the
 * bathroom, plan the summer trip…). Archiving closes it without losing the
 * history; `archivedAt` is an ISO string (varchar) so the in-memory SQLite
 * test DB and Postgres agree without pg-only column types (same approach as
 * `Todo.completedAt`).
 */
@Entity('projects')
export class Project extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: ProjectStatus;

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

  @Column({ type: 'varchar', length: 32, nullable: true })
  archivedAt!: string | null;

  @OneToMany(() => ProjectTask, (task) => task.project, { cascade: true })
  tasks!: ProjectTask[];
}
