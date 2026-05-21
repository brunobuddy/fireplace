import { type Component, For } from 'solid-js';
import type { Member } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CRITICALITY } from '../todo-criticality';
import type { CriticalityGroup } from '../store/todos.helpers';
import type { TodoItemActions } from '../store/todos-store';
import { TodoItemRow } from './TodoItemRow';

interface Props {
  group: CriticalityGroup;
  me: Member | undefined;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  actions: TodoItemActions;
}

export const CriticalitySection: Component<Props> = (props) => {
  const meta = () => CRITICALITY[props.group.criticality];
  return (
    <section class="mb-6">
      <header class="sticky top-[3.75rem] z-[5] mb-2 flex items-center gap-2 px-1 py-1">
        <span class="text-lg" aria-hidden="true">
          {meta().icon}
        </span>
        <h2 class="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          {meta().label}
        </h2>
        <Badge variant="muted" size="sm" class="ml-auto">
          {props.group.todos.length}
        </Badge>
      </header>
      <ul class="flex flex-col gap-2">
        <For each={props.group.todos}>
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
    </section>
  );
};
