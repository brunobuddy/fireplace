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
import { GroceryItem } from './grocery-item.entity';

/**
 * A shopping list owned by a family. A family has one default list today, but
 * the relationship is one-to-many so "Weekly shop", "Party", etc. come for
 * free later without a schema change.
 */
@Entity('grocery_lists')
export class GroceryList extends BaseEntity {
  @Column({ type: 'varchar', length: 120, default: 'Liste de courses' })
  name!: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @ManyToOne(() => Family, (family) => family.groceryLists, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'familyId' })
  family!: Family;

  @OneToMany(() => GroceryItem, (item) => item.list, { cascade: true })
  items!: GroceryItem[];
}
