import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Family } from './family.entity';

export type MemberRole = 'parent' | 'child';

/**
 * A person in the family. Carries the login email so the auth layer can map a
 * signed-in session back to the member that stamps grocery items, to-dos and
 * Spark answers. The model stays family-scoped so multi-family deployments can
 * layer on later without a migration.
 */
@Entity('members')
export class Member extends BaseEntity {
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /**
   * Login email — kept lowercased. Unique so the auth layer can resolve a
   * session. Nullable so TypeORM can add the column to a pre-existing
   * `members` table during schema sync; the seeder reconciles AUTH_USERS onto
   * the hardcoded parent rows on the next boot, so the value is effectively
   * never null in practice (Postgres treats NULLs as distinct under UNIQUE,
   * so multiple null rows during the transition don't collide).
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 200, nullable: true })
  email!: string;

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
