import { type Component, For, Show, createSignal } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorToast } from '@/shared/ui/ErrorToast';
import { Button } from '@/components/ui/button';
import {
  type TodoItemActions,
  createTodosController,
} from '../store/todos-store';
import { AddTodoBar } from './AddTodoBar';
import { CriticalitySection } from './CriticalitySection';
import { DoneSection } from './DoneSection';

/** The to-do screen — wires the family identity to the realtime store. */
export const TodoListView: Component = () => {
  const family = useFamily();
  const ctrl = createTodosController(
    () => family.family()?.id,
    family.currentMember,
  );

  // Accordion: one expanded row at a time, tracked by id.
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const toggleExpand = (id: string): void => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const hasAny = (): boolean => ctrl.open() > 0 || ctrl.done().length > 0;

  const actions: TodoItemActions = {
    onToggle: (t) => void ctrl.actions.toggle(t),
    onDelete: (t) => {
      void ctrl.actions.remove(t);
      setExpandedId((cur) => (cur === t.id ? null : cur));
    },
    onEdit: (t, changes) => void ctrl.actions.edit(t, changes),
    onAddComment: (t, body) => void ctrl.actions.addComment(t, body),
    onRemoveComment: (t, id) => void ctrl.actions.removeComment(t, id),
  };

  return (
    <Show
      when={ctrl.state.status !== 'loading'}
      fallback={<Spinner label="Warming up your to-dos…" />}
    >
      <Show
        when={ctrl.state.status !== 'error'}
        fallback={
          <div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p class="font-semibold text-destructive">{ctrl.state.error}</p>
            <Button onClick={() => void ctrl.actions.reload()}>
              Try again
            </Button>
          </div>
        }
      >
        <AddTodoBar onAdd={(input) => void ctrl.actions.addTodo(input)} />
        <ErrorToast
          message={ctrl.state.error}
          onDismiss={() => ctrl.actions.clearError()}
        />

        <Show when={hasAny()} fallback={<EmptyTodos />}>
          <For each={ctrl.groups()}>
            {(group) => (
              <CriticalitySection
                group={group}
                me={family.currentMember()}
                expandedId={expandedId()}
                onToggleExpand={toggleExpand}
                actions={actions}
              />
            )}
          </For>

          <Show when={ctrl.open() === 0 && ctrl.done().length > 0}>
            <div class="animate-pop-in py-8 text-center font-display text-lg font-extrabold text-success">
              🎉 All done — nice work, team!
            </div>
          </Show>

          <Show when={ctrl.done().length > 0}>
            <DoneSection
              todos={ctrl.done()}
              me={family.currentMember()}
              expandedId={expandedId()}
              onToggleExpand={toggleExpand}
              actions={actions}
            />
          </Show>
        </Show>
      </Show>
    </Show>
  );
};

const EmptyTodos: Component = () => (
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      📝
    </div>
    <h2 class="font-display text-lg font-extrabold">Nothing to do… for now</h2>
    <p class="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
      Add the first thing your family needs to get done — everyone sees it the
      moment you do. 🏡
    </p>
  </div>
);
