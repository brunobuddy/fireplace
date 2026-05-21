import { type Component, Show, createSignal } from 'solid-js';
import type { Todo, TodoCriticality } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/shared/ui/Avatar';
import { relativeTime } from '../store/todos.helpers';
import type { TodoEdits } from '../store/todos-store';
import { CriticalitySegmented } from './CriticalitySegmented';
import { TodoEditForm } from './TodoEditForm';

interface Props {
  todo: Todo;
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo, changes: TodoEdits) => void;
}

/**
 * The detail body revealed when a to-do row expands (the accordion panel):
 * description, provenance, a priority changer, and edit/delete. Title,
 * criticality pill and the done checkbox already live in the row header, so
 * they're not repeated here.
 */
export const TodoDetailPanel: Component<Props> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);

  return (
    <Show
      when={!editing()}
      fallback={
        <TodoEditForm
          todo={props.todo}
          onSave={(changes) => {
            props.onEdit(props.todo, changes);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      }
    >
      <Show when={props.todo.description}>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {props.todo.description}
        </p>
      </Show>

      <Provenance todo={props.todo} />

      <div class="mt-3">
        <CriticalitySegmented
          label="Change priority"
          value={props.todo.criticality}
          onChange={(c: TodoCriticality) =>
            props.onEdit(props.todo, { criticality: c })
          }
        />
      </div>

      <Show
        when={!confirming()}
        fallback={
          <div class="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2">
            <span class="px-1 text-xs font-semibold text-muted-foreground">
              Delete for everyone?
            </span>
            <Button
              size="sm"
              variant="ghost"
              class="ml-auto"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => props.onDelete(props.todo)}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div class="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="flex-1"
            onClick={() => setEditing(true)}
          >
            ✏️ Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="flex-1 text-destructive"
            onClick={() => setConfirming(true)}
          >
            🗑 Delete
          </Button>
        </div>
      </Show>
    </Show>
  );
};

const Provenance: Component<{ todo: Todo }> = (props) => (
  <>
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <Show when={props.todo.createdBy}>
        {(m) => <Avatar name={m().name} color={m().color} size="sm" />}
      </Show>
      <span>
        Added by{' '}
        <b class="text-foreground">{props.todo.createdBy?.name ?? 'someone'}</b>{' '}
        · {relativeTime(props.todo.createdAt)}
      </span>
    </div>
    <Show when={props.todo.status === 'done' && props.todo.completedBy}>
      {(m) => (
        <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar name={m().name} color={m().color} size="sm" />
          <span>
            Completed by <b class="text-foreground">{m().name}</b>
            {props.todo.completedAt
              ? ` · ${relativeTime(props.todo.completedAt)}`
              : ''}
          </span>
        </div>
      )}
    </Show>
  </>
);
