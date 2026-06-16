import { type Component, For, Show, createSignal } from 'solid-js';
import type { Member, Todo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { TodoItemActions } from '../store/todos-store';
import { TodoItemRow } from './TodoItemRow';

interface Props {
  todos: Todo[];
  me: Member | undefined;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  actions: TodoItemActions;
}

/** Finished to-dos, tucked into a collapsible block so they don't crowd. */
export const DoneSection: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <section class="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        class="sticky top-[3.75rem] z-[5] mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
      >
        <span class="text-lg" aria-hidden="true">
          ✅
        </span>
        <h2 class="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Terminées
        </h2>
        <Badge variant="muted" size="sm" class="ml-auto">
          {props.todos.length}
        </Badge>
        <span
          class={cn(
            'text-muted-foreground transition-transform',
            open() && 'rotate-180',
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <Show when={open()}>
        <ul class="flex animate-fade-in-up flex-col gap-2">
          <For each={props.todos}>
            {(todo) => (
              <TodoItemRow
                todo={todo}
                me={props.me}
                expanded={props.expandedId === todo.id}
                onToggleExpand={() => props.onToggleExpand(todo.id)}
                actions={props.actions}
              />
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
};
