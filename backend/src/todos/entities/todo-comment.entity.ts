import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from '../../family/entities/member.entity';
import { Todo } from './todo.entity';

/**
 * A note left on a to-do by a family member. `author` is the "who commented"
 * stamp; `createdAt` (from BaseEntity) gives the thread its chronology.
 */
@Entity('todo_comments')
export class TodoComment extends BaseEntity {
  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  @Index()
  @Column({ type: 'uuid' })
  todoId!: string;

  @ManyToOne(() => Todo, (todo) => todo.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'todoId' })
  todo!: Todo;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: Member;
}
