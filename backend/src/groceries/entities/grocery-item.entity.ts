import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { GroceryList } from './grocery-list.entity';
import { GroceryCategory } from './grocery-category.entity';
import { Member } from '../../family/entities/member.entity';

export type GroceryItemStatus = 'pending' | 'done';

/**
 * A single line on the shopping list. `status` flips between `pending`
 * (still to buy) and `done` (in the cart) — we keep done items around so the
 * other shopper sees what was picked up, then "clear cart" deletes them.
 */
@Entity('grocery_items')
export class GroceryItem extends BaseEntity {
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 24, nullable: true })
  unit!: string | null;

  @Column({ type: 'varchar', length: 280, nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: GroceryItemStatus;

  @Index()
  @Column({ type: 'uuid' })
  listId!: string;

  @ManyToOne(() => GroceryList, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list!: GroceryList;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => GroceryCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category!: GroceryCategory | null;

  @Column({ type: 'uuid' })
  addedById!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addedById' })
  addedBy!: Member;

  @Column({ type: 'uuid', nullable: true })
  checkedById!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkedById' })
  checkedBy!: Member | null;
}
