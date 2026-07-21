import { type Component, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';

interface Props {
  onAdd: (name: string) => void;
}

/** Sticky composer: name the project → Créer (tasks come next, inside it). */
export const AddProjectBar: Component<Props> = (props) => {
  const [name, setName] = createSignal('');

  let input: HTMLInputElement | undefined;

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) return;
    props.onAdd(trimmed);
    setName('');
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
            placeholder="Nouveau projet…"
            enterkeyhint="done"
            aria-label="Nom du projet"
          />
        </TextField>
        <Button
          type="submit"
          disabled={!name().trim()}
          aria-label="Créer le projet"
        >
          Créer
        </Button>
      </div>
    </form>
  );
};
