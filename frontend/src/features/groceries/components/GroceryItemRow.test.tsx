import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import { GroceryItemRow } from './GroceryItemRow';

const item: GroceryItem = {
  id: 'a',
  name: 'Bananas',
  quantity: 3,
  unit: null,
  note: 'ripe',
  status: 'pending',
  listId: 'l',
  categoryId: null,
  addedById: 'm',
  checkedById: null,
  addedBy: {
    id: 'm',
    name: 'Sam',
    role: 'parent',
    color: '#abc',
    familyId: 'f',
  },
  checkedBy: null,
  createdAt: '2026-01-01',
};

const categories: GroceryCategory[] = [
  { id: 'c1', slug: 'produce', name: 'Fruit & Veg', icon: '🥬', sortOrder: 10 },
  { id: 'c2', slug: 'dairy', name: 'Dairy & Eggs', icon: '🧀', sortOrder: 40 },
];

describe('<GroceryItemRow>', () => {
  const noop = () => {};

  it('renders the name, quantity and note', () => {
    const { getByText } = render(() => (
      <GroceryItemRow
        item={item}
        categories={categories}
        onToggle={noop}
        onRemove={noop}
        onMove={noop}
      />
    ));
    expect(getByText('Bananas')).toBeInTheDocument();
    expect(getByText('×3')).toBeInTheDocument();
    expect(getByText('ripe')).toBeInTheDocument();
  });

  it('shows the "Categorizing…" pill while the item has no category', () => {
    const { getByText } = render(() => (
      <GroceryItemRow
        item={item}
        categories={categories}
        onToggle={noop}
        onRemove={noop}
        onMove={noop}
      />
    ));
    expect(getByText('Categorizing…')).toBeInTheDocument();
  });

  it('shows the category name once the item is categorized', () => {
    const categorized: GroceryItem = { ...item, categoryId: 'c1' };
    const { getByText } = render(() => (
      <GroceryItemRow
        item={categorized}
        categories={categories}
        onToggle={noop}
        onRemove={noop}
        onMove={noop}
      />
    ));
    expect(getByText('Fruit & Veg')).toBeInTheDocument();
  });

  it('toggles when the body is tapped', () => {
    const onToggle = vi.fn();
    const { getByLabelText } = render(() => (
      <GroceryItemRow
        item={item}
        categories={categories}
        onToggle={onToggle}
        onRemove={noop}
        onMove={noop}
      />
    ));
    fireEvent.click(getByLabelText('Check off Bananas'));
    expect(onToggle).toHaveBeenCalledWith(item);
  });

  it('removes when the trash button is tapped', () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(() => (
      <GroceryItemRow
        item={item}
        categories={categories}
        onToggle={noop}
        onRemove={onRemove}
        onMove={noop}
      />
    ));
    fireEvent.click(getByLabelText('Remove Bananas'));
    expect(onRemove).toHaveBeenCalledWith(item);
  });
});
