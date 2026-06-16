import { type Component, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import type { QuickAddInput } from '../store/groceries-store';

interface Props {
  onAdd: (input: QuickAddInput) => void;
}

/**
 * Sticky cosy composer. Type → Enter and the item is in the list. No aisle
 * picker — the server categorizes via the LLM router after the row lands.
 * If it gets it wrong, users re-bucket through the row's category chip
 * (tap on mobile, drag on desktop).
 */
export const AddItemBar: Component<Props> = (props) => {
  const [name, setName] = createSignal('');
  const [qty, setQty] = createSignal(1);

  let input: HTMLInputElement | undefined;

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) return;
    props.onAdd({ name: trimmed, quantity: qty() });
    setName('');
    setQty(1);
    input?.focus();
  };

  return (
    <form
      class="sticky top-0 z-10 mb-3 bg-background/85 pb-3 backdrop-blur-md"
      onSubmit={submit}
    >
      <div class="flex items-stretch gap-2">
        <TextField class="flex-1" value={name()} onChange={setName}>
          <TextFieldInput
            ref={input}
            type="text"
            placeholder="Ajouter un article…"
            enterkeyhint="done"
            aria-label="Nom de l’article"
          />
        </TextField>

        <div
          class="flex items-center gap-1 rounded-lg border border-border bg-card px-2 shadow-cosy"
          role="group"
          aria-label="Quantité"
        >
          <button
            type="button"
            class="h-full w-7 text-lg font-extrabold text-muted-foreground active:text-foreground"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Diminuer la quantité"
          >
            −
          </button>
          <span
            class="min-w-[1.1rem] text-center text-sm font-extrabold"
            aria-live="polite"
          >
            {qty()}
          </span>
          <button
            type="button"
            class="h-full w-7 text-lg font-extrabold text-muted-foreground active:text-foreground"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Augmenter la quantité"
          >
            +
          </button>
        </div>

        <Button type="submit" disabled={!name().trim()} aria-label="Ajouter l’article">
          Ajouter
        </Button>
      </div>
    </form>
  );
};
