import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from '../../family/entities/member.entity';
import { ProjectTask } from './project-task.entity';

/**
 * A note left on a project task by a family member — same shape as
 * `TodoComment`. `author` is the "who commented" stamp; `createdAt` (from
 * BaseEntity) gives the thread its chronology.
 */
@Entity('project_task_comments')
export class ProjectTaskComment extends BaseEntity {
  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  @Index()
  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => ProjectTask, (task) => task.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'taskId' })
  task!: ProjectTask;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: Member;
}
