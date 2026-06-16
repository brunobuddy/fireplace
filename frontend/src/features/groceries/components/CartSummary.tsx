import { type Component, For, Show, createSignal } from 'solid-js';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { GroceryItemRow } from './GroceryItemRow';

interface Props {
  cart: GroceryItem[];
  categories: GroceryCategory[];
  onToggle: (item: GroceryItem) => void;
  onRemove: (item: GroceryItem) => void;
  onMove: (item: GroceryItem, categoryId: string | null) => void;
  onClear: () => void;
}

/** Floating "in the basket" tray — review picked-up items, then clear. */
export const CartSummary: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);

  return (
    <Show when={props.cart.length > 0}>
      <div class="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-[15] w-full max-w-[calc(36rem-2rem)] -translate-x-1/2 px-4">
        <Show when={open()}>
          <ul class="mb-2 flex max-h-[46vh] animate-fade-in-up flex-col gap-2 overflow-y-auto rounded-xl border border-border/70 bg-card p-3 shadow-cosy-lg">
            <For each={props.cart}>
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
        </Show>

        <div class="flex items-center gap-2 rounded-full bg-foreground p-2 text-background shadow-cosy-lg">
          <button
            class="flex flex-1 items-center gap-2 px-3 py-1.5 text-sm font-bold"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open()}
          >
            <span class="inline-flex h-[1.4rem] min-w-[1.4rem] items-center justify-center rounded-full bg-success px-1.5 text-xs font-extrabold text-success-foreground">
              {props.cart.length}
            </span>
            dans le panier
            <span
              class={cn(
                'ml-auto opacity-70 transition-transform',
                open() && 'rotate-180',
              )}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          <Button size="pill" variant="accent" onClick={() => props.onClear()}>
            Vider le panier
          </Button>
        </div>
      </div>
    </Show>
  );
};
