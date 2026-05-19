import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { GroceryItem } from '@/lib/types';
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

describe('<GroceryItemRow>', () => {
  it('renders the name, quantity and note', () => {
    const { getByText } = render(() => (
      <GroceryItemRow item={item} onToggle={() => {}} onRemove={() => {}} />
    ));
    expect(getByText('Bananas')).toBeInTheDocument();
    expect(getByText('×3')).toBeInTheDocument();
    expect(getByText('ripe')).toBeInTheDocument();
  });

  it('toggles when the body is tapped', () => {
    const onToggle = vi.fn();
    const { getByLabelText } = render(() => (
      <GroceryItemRow item={item} onToggle={onToggle} onRemove={() => {}} />
    ));
    fireEvent.click(getByLabelText('Check off Bananas'));
    expect(onToggle).toHaveBeenCalledWith(item);
  });

  it('removes when the trash button is tapped', () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(() => (
      <GroceryItemRow item={item} onToggle={() => {}} onRemove={onRemove} />
    ));
    fireEvent.click(getByLabelText('Remove Bananas'));
    expect(onRemove).toHaveBeenCalledWith(item);
  });
});
