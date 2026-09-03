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
import { LostObjectComment } from './lost-object-comment.entity';

export type LostObjectStatus = 'lost' | 'found';

/**
 * A misplaced household object. Deliberately minimal: a name, who reported it
 * missing, and — once someone lays hands on it — who found it and when.
 * `foundAt` is an ISO string (varchar) like `completedAt` on todos, so the
 * in-memory SQLite test DB and Postgres agree without pg-only column types.
 */
@Entity('lost_objects')
export class LostObject extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'lost' })
  status!: LostObjectStatus;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family!: Family;

  @Column({ type: 'uuid' })
  reportedById!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedById' })
  reportedBy!: Member;

  @Column({ type: 'uuid', nullable: true })
  foundById!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'foundById' })
  foundBy!: Member | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  foundAt!: string | null;

  @OneToMany(() => LostObjectComment, (comment) => comment.lostObject, {
    cascade: true,
  })
  comments!: LostObjectComment[];
}
