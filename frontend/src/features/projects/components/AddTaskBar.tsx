import { type Component, Show, createSignal } from 'solid-js';
import type { Member, ProjectTaskPriority } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextField, TextFieldInput } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import type { QuickAddTaskInput } from '../store/projects-store';
import { PrioritySegmented } from './PrioritySegmented';
import { AssigneePicker } from './AssigneePicker';

interface Props {
  members: Member[];
  onAdd: (input: QuickAddTaskInput) => void;
}

/**
 * Folded by default so an open project stays readable: one quiet
 * "Ajouter une tâche" row that unfolds the composer (title, priority,
 * responsible). It stays open between adds — queuing several steps is the
 * common gesture — and priority/assignee stick from one task to the next.
 */
export const AddTaskBar: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [title, setTitle] = createSignal('');
  const [priority, setPriority] = createSignal<ProjectTaskPriority>('medium');
  const [assigneeId, setAssigneeId] = createSignal<string | null>(null);

  let input: HTMLInputElement | undefined;

  const toggle = (): void => {
    const next = !open();
    setOpen(next);
    if (next) input?.focus();
  };

  const submit = (e: Event): void => {
    e.preventDefault();
    const trimmed = title().trim();
    if (!trimmed) return;
    props.onAdd({
      title: trimmed,
      priority: priority(),
      assigneeId: assigneeId(),
    });
    setTitle('');
    input?.focus();
  };

  return (
    <div class="mt-3 border-t border-border/60 pt-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open()}
        class="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
      >
        <span aria-hidden="true">➕</span>
        <span>Ajouter une tâche</span>
        <span
          class={cn(
            'ml-auto transition-transform duration-200',
            open() && 'rotate-180',
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <Show when={open()}>
        <form
          class="mt-1 flex animate-fade-in-up flex-col gap-2"
          onSubmit={submit}
        >
          <div class="flex items-stretch gap-2">
            <TextField class="flex-1" value={title()} onChange={setTitle}>
              <TextFieldInput
                ref={input}
                type="text"
                placeholder="Ajouter une tâche…"
                enterkeyhint="done"
                aria-label="Titre de la tâche"
              />
            </TextField>
            <Button
              type="submit"
              disabled={!title().trim()}
              aria-label="Ajouter la tâche"
            >
              Ajouter
            </Button>
          </div>
          <PrioritySegmented value={priority()} onChange={setPriority} />
          <AssigneePicker
            members={props.members}
            value={assigneeId()}
            onChange={setAssigneeId}
          />
        </form>
      </Show>
    </div>
  );
};
