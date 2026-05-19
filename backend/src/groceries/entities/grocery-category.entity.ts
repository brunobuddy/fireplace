import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * A supermarket aisle / section. Reference data shared by all families and
 * seeded on bootstrap. Items are grouped by category in the UI so the list
 * is walked aisle-by-aisle (state-of-the-art shopping behaviour).
 */
@Entity('grocery_categories')
export class GroceryCategory extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  /** Emoji shown next to the category header. */
  @Column({ type: 'varchar', length: 8 })
  icon!: string;

  /** Walking order through the store. Lower = earlier. */
  @Column({ type: 'int', default: 100 })
  sortOrder!: number;
}
