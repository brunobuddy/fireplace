import { type Component, For, createSignal } from 'solid-js';
import type { GroceryCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import type { QuickAddInput } from '../store/groceries-store';

interface Props {
  categories: GroceryCategory[];
  onAdd: (input: QuickAddInput) => void;
}

/** Sticky cosy composer: type → Enter. Stepper + optional aisle chip. */
export const AddItemBar: Component<Props> = (props) => {
  const [name, setName] = createSignal('');
  const [qty, setQty] = createSignal(1);
  const [categoryId, setCategoryId] = createSignal<string | undefined>();

  let input: HTMLInputElement | undefined;

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) return;
    props.onAdd({ name: trimmed, quantity: qty(), categoryId: categoryId() });
    setName('');
    setQty(1);
    input?.focus();
  };

  return (
    <form
      class="sticky top-0 z-10 mb-2 bg-background/85 pb-3 backdrop-blur-md"
      onSubmit={submit}
    >
      <div class="flex items-stretch gap-2">
        <TextField class="flex-1" value={name()} onChange={setName}>
          <TextFieldInput
            ref={input}
            type="text"
            placeholder="Add an item…"
            enterkeyhint="done"
            aria-label="Item name"
          />
        </TextField>

        <div
          class="flex items-center gap-1 rounded-lg border border-border bg-card px-2 shadow-cosy"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            class="h-full w-7 text-lg font-extrabold text-muted-foreground active:text-foreground"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span class="min-w-[1.1rem] text-center text-sm font-extrabold" aria-live="polite">
            {qty()}
          </span>
          <button
            type="button"
            class="h-full w-7 text-lg font-extrabold text-muted-foreground active:text-foreground"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <Button type="submit" disabled={!name().trim()} aria-label="Add item">
          Add
        </Button>
      </div>

      <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pt-3 [scrollbar-width:none]">
        <ChipButton
          active={categoryId() === undefined}
          onClick={() => setCategoryId(undefined)}
        >
          ✨ Auto
        </ChipButton>
        <For each={props.categories}>
          {(c) => (
            <ChipButton
              active={categoryId() === c.id}
              onClick={() => setCategoryId(c.id)}
            >
              <span aria-hidden="true">{c.icon}</span> {c.name}
            </ChipButton>
          )}
        </For>
      </div>
    </form>
  );
};

const ChipButton: Component<{
  active: boolean;
  onClick: () => void;
  children: unknown;
}> = (props) => (
  <button
    type="button"
    onClick={() => props.onClick()}
    class={cn(
      'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-bold transition-all',
      props.active
        ? 'border-primary bg-primary text-primary-foreground shadow-cosy'
        : 'border-border bg-card text-muted-foreground active:bg-muted',
    )}
  >
    {props.children as never}
  </button>
);
