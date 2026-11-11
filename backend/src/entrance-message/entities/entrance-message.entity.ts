import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Family } from '../../family/entities/family.entity';
import { Member } from '../../family/entities/member.entity';

/** Longest message the entrance screen accepts (after trimming). */
export const ENTRANCE_MESSAGE_MAX_LENGTH = 280;

/**
 * The one short note shown on the e-ink screen at the house entrance. A family
 * has at most one row (`familyId` is unique): posting a new message upserts it,
 * clearing deletes it. `updatedAt` (from BaseEntity) is what the screen shows
 * as "since when". The author is kept nullable so removing a member never
 * takes the message down with it.
 */
@Entity('entrance_messages')
export class EntranceMessage extends BaseEntity {
  @Column({ type: 'varchar', length: ENTRANCE_MESSAGE_MAX_LENGTH })
  text!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family!: Family;

  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author!: Member | null;
}
