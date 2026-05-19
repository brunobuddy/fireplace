import { describe, expect, it } from 'vitest';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import {
  doneItems,
  groupPendingByCategory,
  pendingCount,
  removeById,
  removeManyByIds,
  upsert,
} from './groceries.helpers';

const item = (over: Partial<GroceryItem>): GroceryItem =>
  ({
    id: 'i',
    name: 'X',
    quantity: 1,
    unit: null,
    note: null,
    status: 'pending',
    listId: 'l',
    categoryId: null,
    addedById: 'm',
    checkedById: null,
    createdAt: '2026-01-01',
    ...over,
  }) as GroceryItem;

const cat = (id: string, sortOrder: number): GroceryCategory => ({
  id,
  slug: id,
  name: id,
  icon: '🛒',
  sortOrder,
});

describe('groceries.helpers', () => {
  it('upsert appends when new and replaces when existing', () => {
    const a = item({ id: 'a' });
    const list = upsert([], a);
    expect(list).toHaveLength(1);

    const updated = upsert(list, { ...a, name: 'Renamed' });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Renamed');
  });

  it('removeById and removeManyByIds drop the right rows', () => {
    const list = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })];
    expect(removeById(list, 'b').map((i) => i.id)).toEqual(['a', 'c']);
    expect(removeManyByIds(list, ['a', 'c']).map((i) => i.id)).toEqual(['b']);
  });

  it('groups pending items by aisle order, ignoring done items', () => {
    const items = [
      item({ id: '1', categoryId: 'dairy', status: 'pending' }),
      item({ id: '2', categoryId: 'produce', status: 'pending' }),
      item({ id: '3', categoryId: 'produce', status: 'done' }),
      item({ id: '4', categoryId: null, status: 'pending' }),
    ];
    const cats = [cat('produce', 10), cat('dairy', 40)];

    const groups = groupPendingByCategory(items, cats);

    expect(groups.map((g) => g.category?.slug ?? 'none')).toEqual([
      'produce',
      'dairy',
      'none',
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(['2']);
  });

  it('counts pending and collects done', () => {
    const items = [
      item({ id: '1', status: 'pending' }),
      item({ id: '2', status: 'done' }),
      item({ id: '3', status: 'done' }),
    ];
    expect(pendingCount(items)).toBe(1);
    expect(doneItems(items).map((i) => i.id)).toEqual(['2', '3']);
  });
});
