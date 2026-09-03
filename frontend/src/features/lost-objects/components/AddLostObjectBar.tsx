import { type Component, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';

interface Props {
  onReport: (name: string) => void;
}

/** Sticky composer: type the lost object's name → Enter. Nothing else. */
export const AddLostObjectBar: Component<Props> = (props) => {
  const [name, setName] = createSignal('');

  let input: HTMLInputElement | undefined;

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) return;
    props.onReport(trimmed);
    setName('');
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
            placeholder="Quel objet est perdu ?"
            enterkeyhint="done"
            aria-label="Nom de l’objet perdu"
          />
        </TextField>
        <Button
          type="submit"
          disabled={!name().trim()}
          aria-label="Signaler l’objet perdu"
        >
          Signaler
        </Button>
      </div>
    </form>
  );
};
