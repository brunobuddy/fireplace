import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Family } from './family.entity';

export type MemberRole = 'parent' | 'child';

/**
 * A person in the family. Used as the lightweight "profile switcher" identity
 * for now (no passwords). The data model is already family-scoped so real
 * authentication can be layered on later without a migration.
 */
@Entity('members')
export class Member extends BaseEntity {
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'parent' })
  role!: MemberRole;

  /** Hex color used to render the member's avatar in the UI. */
  @Column({ type: 'varchar', length: 9 })
  color!: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, (family) => family.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'familyId' })
  family!: Family;
}
