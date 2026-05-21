import { type Component, createSignal } from 'solid-js';
import type { TodoCriticality } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import { CriticalitySegmented } from './CriticalitySegmented';
import type { QuickAddTodoInput } from '../store/todos-store';

interface Props {
  onAdd: (input: QuickAddTodoInput) => void;
}

/** Sticky composer: type → Enter. Priority defaults to "This week". */
export const AddTodoBar: Component<Props> = (props) => {
  const [title, setTitle] = createSignal('');
  const [criticality, setCriticality] = createSignal<TodoCriticality>('medium');

  let input: HTMLInputElement | undefined;

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = title().trim();
    if (!trimmed) return;
    props.onAdd({ title: trimmed, criticality: criticality() });
    setTitle('');
    input?.focus();
  };

  return (
    <form
      class="sticky top-0 z-10 mb-2 bg-background/85 pb-3 backdrop-blur-md"
      onSubmit={submit}
    >
      <div class="flex items-stretch gap-2">
        <TextField class="flex-1" value={title()} onChange={setTitle}>
          <TextFieldInput
            ref={input}
            type="text"
            placeholder="Add a to-do…"
            enterkeyhint="done"
            aria-label="To-do title"
          />
        </TextField>
        <Button type="submit" disabled={!title().trim()} aria-label="Add to-do">
          Add
        </Button>
      </div>
      <div class="pt-3">
        <CriticalitySegmented value={criticality()} onChange={setCriticality} />
      </div>
    </form>
  );
};
