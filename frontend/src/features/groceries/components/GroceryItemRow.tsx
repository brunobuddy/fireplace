import { type Component, Show } from 'solid-js';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/lib/cn';
import { CategoryChip } from './CategoryChip';
import { DRAG_MIME, type DragPayload } from './drag';

interface Props {
  item: GroceryItem;
  categories: GroceryCategory[];
  onToggle: (item: GroceryItem) => void;
  onRemove: (item: GroceryItem) => void;
  onMove: (item: GroceryItem, categoryId: string | null) => void;
}

/**
 * One line on the list. Tapping the body checks it off; trash deletes. The
 * category chip (right side) lets the user re-bucket by tap (mobile-friendly
 * dropdown) or drag-and-drop (desktop — the whole row is a drag source; the
 * target CategorySection accepts the drop).
 */
export const GroceryItemRow: Component<Props> = (props) => {
  const done = (): boolean => props.item.status === 'done';

  const handleDragStart = (e: DragEvent): void => {
    if (!e.dataTransfer) return;
    const payload: DragPayload = { itemId: props.item.id };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <li
      class={cn(
        'flex animate-fade-in-up items-stretch overflow-hidden rounded-xl border border-border/60 bg-card shadow-cosy transition-all',
        done() && 'opacity-65',
      )}
      draggable={!done()}
      onDragStart={handleDragStart}
    >
      <button
        class="flex flex-1 items-center gap-3 px-3 py-3 text-left active:bg-muted/60"
        onClick={() => props.onToggle(props.item)}
        aria-pressed={done()}
        aria-label={`${done() ? 'Uncheck' : 'Check off'} ${props.item.name}`}
      >
        <span
          class={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
            done()
              ? 'scale-105 border-success bg-success text-white'
              : 'border-border text-transparent',
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4">
            <path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            class={cn(
              'flex items-baseline gap-2 font-bold',
              done() &&
                'text-muted-foreground line-through decoration-muted-foreground/60',
            )}
          >
            {props.item.name}
            <Show when={props.item.quantity > 1}>
              <span class="rounded-full bg-accent/25 px-2 py-px text-xs font-extrabold text-accent-foreground">
                ×{props.item.quantity}
              </span>
            </Show>
          </span>
          <Show when={props.item.note}>
            <span class="truncate text-xs text-muted-foreground">
              {props.item.note}
            </span>
          </Show>
        </span>

        <Show when={props.item.addedBy}>
          {(m) => <Avatar name={m().name} color={m().color} size="sm" />}
        </Show>
      </button>

      <div class="flex items-center pr-1">
        <CategoryChip
          item={props.item}
          categories={props.categories}
          onMove={(categoryId) => props.onMove(props.item, categoryId)}
        />
      </div>

      <button
        class="flex items-center px-4 text-muted-foreground transition-colors active:bg-muted active:text-destructive"
        onClick={() => props.onRemove(props.item)}
        aria-label={`Remove ${props.item.name}`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            d="M6 7h12M9 7V5h6v2m-7 0 1 13h6l1-13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </li>
  );
};
