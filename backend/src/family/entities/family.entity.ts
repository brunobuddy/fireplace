import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Member } from './member.entity';
import { GroceryList } from '../../groceries/entities/grocery-list.entity';

/**
 * The top-level tenant of the app. Everything else (members, grocery lists,
 * and — later — agendas and conversations) hangs off a Family.
 */
@Entity('families')
export class Family extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @OneToMany(() => Member, (member) => member.family, { cascade: true })
  members!: Member[];

  @OneToMany(() => GroceryList, (list) => list.family, { cascade: true })
  groceryLists!: GroceryList[];
}
