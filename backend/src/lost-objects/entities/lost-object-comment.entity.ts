import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from '../../family/entities/member.entity';
import { LostObject } from './lost-object.entity';

/**
 * A note left on a lost object — typically a search suggestion ("regarde
 * sous le canapé"). `author` is the "who said it" stamp; `createdAt` (from
 * BaseEntity) gives the thread its chronology.
 */
@Entity('lost_object_comments')
export class LostObjectComment extends BaseEntity {
  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  @Index()
  @Column({ type: 'uuid' })
  lostObjectId!: string;

  @ManyToOne(() => LostObject, (object) => object.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lostObjectId' })
  lostObject!: LostObject;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: Member;
}
