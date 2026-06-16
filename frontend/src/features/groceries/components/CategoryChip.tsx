import { type Component, For, Show } from 'solid-js';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';

interface Props {
  item: GroceryItem;
  categories: GroceryCategory[];
  onMove: (categoryId: string | null) => void;
}

/**
 * The per-row category control. Renders the current aisle as a tappable chip
 * — or a "✨ Categorizing…" pill while the server's LLM is still thinking —
 * and opens a Kobalte dropdown of every aisle so the user can re-bucket with
 * one tap (mobile) or one click (desktop). The "Uncategorized" entry clears
 * the assignment.
 */
export const CategoryChip: Component<Props> = (props) => {
  const current = (): GroceryCategory | null =>
    props.categories.find((c) => c.id === props.item.categoryId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as="button"
        type="button"
        aria-label={
          current()
            ? `Changer de catégorie (actuellement ${current()!.name})`
            : 'Définir la catégorie'
        }
        class={cn(
          'flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[0.68rem] font-bold transition-colors',
          'border border-transparent active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          current()
            ? 'bg-muted/70 text-muted-foreground'
            : 'animate-pulse bg-accent/25 text-accent-foreground',
        )}
      >
        <Show
          when={current()}
          fallback={
            <>
              <span aria-hidden="true">✨</span>
              <span>Classement…</span>
            </>
          }
        >
          {(cat) => (
            <>
              <span aria-hidden="true">{cat().icon}</span>
              <span>{cat().name}</span>
            </>
          )}
        </Show>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="max-h-72 overflow-y-auto">
        <For each={props.categories}>
          {(c) => (
            <DropdownMenuItem
              onSelect={() => props.onMove(c.id)}
              class={cn(
                props.item.categoryId === c.id && 'bg-primary/10 text-primary',
              )}
            >
              <span aria-hidden="true" class="text-base">
                {c.icon}
              </span>
              <span>{c.name}</span>
            </DropdownMenuItem>
          )}
        </For>
        <DropdownMenuItem
          onSelect={() => props.onMove(null)}
          class="border-t border-border/60 text-muted-foreground"
        >
          <span aria-hidden="true">✨</span>
          <span>Reclasser automatiquement</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
