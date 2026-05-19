import type { GroceryCategory, GroceryItem } from '@/lib/types';

/** Pure list operations — kept side-effect free so they're unit-testable. */

export function upsert(items: GroceryItem[], next: GroceryItem): GroceryItem[] {
  const idx = items.findIndex((i) => i.id === next.id);
  if (idx === -1) {
    return [...items, next];
  }
  const copy = items.slice();
  copy[idx] = next;
  return copy;
}

export function removeById(items: GroceryItem[], id: string): GroceryItem[] {
  return items.filter((i) => i.id !== id);
}

export function removeManyByIds(
  items: GroceryItem[],
  ids: string[],
): GroceryItem[] {
  const set = new Set(ids);
  return items.filter((i) => !set.has(i.id));
}

export interface CategoryGroup {
  category: GroceryCategory | null;
  items: GroceryItem[];
}

/**
 * Buckets the still-to-buy items by aisle, ordered the way you walk the
 * store. Uncategorised items fall into a trailing "Other" bucket.
 */
export function groupPendingByCategory(
  items: GroceryItem[],
  categories: GroceryCategory[],
): CategoryGroup[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const buckets = new Map<string, CategoryGroup>();

  for (const item of items) {
    if (item.status !== 'pending') continue;
    const key = item.categoryId ?? '__none__';
    if (!buckets.has(key)) {
      buckets.set(key, {
        category: item.categoryId ? (byId.get(item.categoryId) ?? null) : null,
        items: [],
      });
    }
    buckets.get(key)!.items.push(item);
  }

  return [...buckets.values()].sort(
    (a, b) =>
      (a.category?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.category?.sortOrder ?? Number.MAX_SAFE_INTEGER),
  );
}

export const pendingCount = (items: GroceryItem[]): number =>
  items.filter((i) => i.status === 'pending').length;

export const doneItems = (items: GroceryItem[]): GroceryItem[] =>
  items.filter((i) => i.status === 'done');
