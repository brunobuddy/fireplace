import { type Component, createSignal } from 'solid-js';
import type { Todo, TodoCriticality } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { CriticalitySegmented } from './CriticalitySegmented';
import type { TodoEdits } from '../store/todos-store';

interface Props {
  todo: Todo;
  onSave: (changes: TodoEdits) => void;
  onCancel: () => void;
}

/** Inline edit of title, description and priority, shown inside the sheet. */
export const TodoEditForm: Component<Props> = (props) => {
  // Seed the inputs once from the todo. The form remounts each time the
  // editor opens, and we deliberately don't want a realtime update to reset
  // a field mid-edit — so these reads are intentionally non-reactive.
  /* eslint-disable solid/reactivity */
  const [title, setTitle] = createSignal(props.todo.title);
  const [description, setDescription] = createSignal(
    props.todo.description ?? '',
  );
  const [criticality, setCriticality] = createSignal<TodoCriticality>(
    props.todo.criticality,
  );
  /* eslint-enable solid/reactivity */

  const save = (e: Event): void => {
    e.preventDefault();
    const trimmed = title().trim();
    if (!trimmed) return;
    props.onSave({
      title: trimmed,
      description: description().trim() || null,
      criticality: criticality(),
    });
  };

  return (
    <form class="flex flex-col gap-3" onSubmit={save}>
      <TextField value={title()} onChange={setTitle}>
        <TextFieldInput aria-label="Title" placeholder="Title" />
      </TextField>
      <Textarea
        rows={3}
        value={description()}
        onInput={(e) => setDescription(e.currentTarget.value)}
        placeholder="Add a description (optional)…"
        aria-label="Description"
      />
      <CriticalitySegmented value={criticality()} onChange={setCriticality} />
      <div class="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          class="flex-1"
          onClick={() => props.onCancel()}
        >
          Cancel
        </Button>
        <Button type="submit" class="flex-1" disabled={!title().trim()}>
          Save
        </Button>
      </div>
    </form>
  );
};
