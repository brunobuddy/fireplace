import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from '../../family/entities/member.entity';
import { Project } from './project.entity';
import { ProjectTaskComment } from './project-task-comment.entity';

/** Adds `blocking` above the to-do levels: the step the project is stuck on. */
export type ProjectTaskPriority = 'low' | 'medium' | 'high' | 'blocking';
export type ProjectTaskStatus = 'open' | 'done';

/**
 * One step of a project. Unlike a household to-do it can carry a responsible
 * member (`assignee`) — exactly one, or nobody. The member stamps follow the
 * todos convention: `createdBy` / `completedBy` answer "who added / finished
 * this", and `completedAt` is a cross-driver-safe ISO varchar.
 */
@Entity('project_tasks')
export class ProjectTask extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority!: ProjectTaskPriority;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: ProjectTaskStatus;

  @Index()
  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee!: Member | null;

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

  @OneToMany(() => ProjectTaskComment, (comment) => comment.task, {
    cascade: true,
  })
  comments!: ProjectTaskComment[];
}
