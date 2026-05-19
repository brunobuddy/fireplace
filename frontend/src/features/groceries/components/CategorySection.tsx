import { type Component, For } from 'solid-js';
import type { GroceryItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import type { CategoryGroup } from '../store/groceries.helpers';
import { GroceryItemRow } from './GroceryItemRow';

interface Props {
  group: CategoryGroup;
  onToggle: (item: GroceryItem) => void;
  onRemove: (item: GroceryItem) => void;
}

export const CategorySection: Component<Props> = (props) => (
  <section class="mb-6">
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
            onToggle={props.onToggle}
            onRemove={props.onRemove}
          />
        )}
      </For>
    </ul>
  </section>
);
