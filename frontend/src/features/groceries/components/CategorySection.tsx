import { type Component, For, createSignal } from 'solid-js';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { CategoryGroup } from '../store/groceries.helpers';
import { GroceryItemRow } from './GroceryItemRow';
import { DRAG_MIME, type DragPayload } from './drag';

interface Props {
  group: CategoryGroup;
  categories: GroceryCategory[];
  items: GroceryItem[];
  onToggle: (item: GroceryItem) => void;
  onRemove: (item: GroceryItem) => void;
  onMove: (item: GroceryItem, categoryId: string | null) => void;
}

/**
 * One aisle bucket. Acts as a drop target for desktop drag-and-drop —
 * dropping a row swaps its category to this section's category. The dropped
 * row is looked up in `props.items` (the full list) so the section can call
 * the same `move` action the per-row picker uses.
 */
export const CategorySection: Component<Props> = (props) => {
  const [over, setOver] = createSignal(false);

  const handleDragOver = (e: DragEvent): void => {
    if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!over()) setOver(true);
  };

  const handleDragLeave = (): void => {
    setOver(false);
  };

  const handleDrop = (e: DragEvent): void => {
    setOver(false);
    const raw = e.dataTransfer?.getData(DRAG_MIME);
    if (!raw) return;
    e.preventDefault();
    try {
      const payload = JSON.parse(raw) as DragPayload;
      const item = props.items.find((i) => i.id === payload.itemId);
      if (!item) return;
      props.onMove(item, props.group.category?.id ?? null);
    } catch {
      // Swallow malformed drag payloads — DnD is a soft input, never fatal.
    }
  };

  return (
    <section
      class={cn(
        'mb-6 rounded-2xl transition-colors',
        over() && 'bg-primary/10 ring-2 ring-primary/40',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header class="sticky top-[3.75rem] z-[5] mb-2 flex items-center gap-2 px-1 py-1">
        <span class="text-lg" aria-hidden="true">
          {props.group.category?.icon ?? '🛒'}
        </span>
        <h2 class="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          {props.group.category?.name ?? 'Uncategorised'}
        </h2>
        <Badge variant="muted" size="sm" class="ml-auto">
          {props.group.items.length}
        </Badge>
      </header>
      <ul class="flex flex-col gap-2">
        <For each={props.group.items}>
          {(item) => (
            <GroceryItemRow
              item={item}
              categories={props.categories}
              onToggle={props.onToggle}
              onRemove={props.onRemove}
              onMove={props.onMove}
            />
          )}
        </For>
      </ul>
    </section>
  );
};
