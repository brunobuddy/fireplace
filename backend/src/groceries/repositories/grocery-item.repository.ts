import { GroceryItem } from '../entities/grocery-item.entity';

/** DI token for the grocery-item persistence port. */
export const GROCERY_ITEM_REPOSITORY = Symbol('GROCERY_ITEM_REPOSITORY');

export type NewGroceryItem = Pick<
  GroceryItem,
  'name' | 'quantity' | 'unit' | 'note' | 'listId' | 'categoryId' | 'addedById'
>;

export type GroceryItemChanges = Partial<
  Pick<
    GroceryItem,
    | 'name'
    | 'quantity'
    | 'unit'
    | 'note'
    | 'categoryId'
    | 'status'
    | 'checkedById'
  >
>;

/**
 * Persistence port for grocery items. The service depends on this abstraction,
 * not on TypeORM (Dependency Inversion) — swapping the store, or faking it in
 * tests, never touches business logic.
 */
export interface IGroceryItemRepository {
  findByList(listId: string): Promise<GroceryItem[]>;
  findById(id: string): Promise<GroceryItem | null>;
  create(data: NewGroceryItem): Promise<GroceryItem>;
  update(id: string, changes: GroceryItemChanges): Promise<GroceryItem>;
  remove(id: string): Promise<void>;
  removeDoneByList(listId: string): Promise<string[]>;
}
