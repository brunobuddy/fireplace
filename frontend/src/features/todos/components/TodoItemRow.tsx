import { type Component, Show } from 'solid-js';
import type { Member, Todo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/lib/cn';
import { CRITICALITY } from '../todo-criticality';
import { commentCount, relativeTime } from '../store/todos.helpers';
import type { TodoItemActions } from '../store/todos-store';
import { TodoDetailPanel } from './TodoDetailPanel';
import { CommentThread } from './CommentThread';
import { CommentComposer } from './CommentComposer';

interface Props {
  todo: Todo;
  me: Member | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  actions: TodoItemActions;
}

/**
 * One accordion item: a tappable header row (checkbox toggles done; the body
 * expands) that reveals the details + comment thread inline below it.
 */
export const TodoItemRow: Component<Props> = (props) => {
  const done = (): boolean => props.todo.status === 'done';
  const meta = () => CRITICALITY[props.todo.criticality];
  const bar = (): string => (done() ? 'before:bg-border' : meta().bar);
  const comments = (): number => commentCount(props.todo);
  const panelId = (): string => `todo-panel-${props.todo.id}`;

  return (
    <li
      class={cn(
        'relative flex animate-fade-in-up flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-cosy transition-all',
        'before:absolute before:inset-y-0 before:left-0 before:w-1.5',
        bar(),
        done() && 'opacity-60',
      )}
    >
      <div class="flex items-stretch">
        <button
          class="flex min-h-[3.5rem] items-center justify-center pl-3.5 pr-2 active:bg-muted/60"
          onClick={() => props.actions.onToggle(props.todo)}
          aria-pressed={done()}
          aria-label={`${done() ? 'Mark not done' : 'Mark done'}: ${props.todo.title}`}
        >
          <span
            class={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
              done()
                ? 'scale-105 border-success bg-success text-white'
                : 'border-border text-transparent',
            )}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>

        <button
          class="flex min-h-[3.5rem] flex-1 items-center gap-3 py-3 pr-3 text-left active:bg-muted/40"
          onClick={() => props.onToggleExpand()}
          aria-expanded={props.expanded}
          aria-controls={panelId()}
          aria-label={`${props.expanded ? 'Collapse' : 'Open'} ${props.todo.title}`}
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class={cn(
                'flex items-center gap-2 font-bold',
                done() &&
                  'text-muted-foreground line-through decoration-muted-foreground/60',
              )}
            >
              <span class="truncate">{props.todo.title}</span>
              <Show when={!done() && props.todo.criticality !== 'low'}>
                <Badge variant={meta().badge} size="sm" class="flex-shrink-0">
                  <span aria-hidden="true">{meta().icon}</span> {meta().label}
                </Badge>
              </Show>
            </span>
            <Show when={done() && props.todo.completedBy}>
              {(m) => (
                <span class="truncate text-xs text-muted-foreground">
                  Done by {m().name}
                  {props.todo.completedAt
                    ? ` · ${relativeTime(props.todo.completedAt)}`
                    : ''}
                </span>
              )}
            </Show>
          </span>

          <span class="flex flex-shrink-0 items-center gap-2">
            <Show when={comments() > 0}>
              <span
                class="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground"
                aria-label={`${comments()} ${comments() === 1 ? 'comment' : 'comments'}`}
              >
                <span aria-hidden="true">💬</span> {comments()}
              </span>
            </Show>
            <Show when={props.todo.createdBy}>
              {(m) => <Avatar name={m().name} color={m().color} size="sm" />}
            </Show>
            <span
              class={cn(
                'text-muted-foreground transition-transform duration-200',
                props.expanded && 'rotate-180',
              )}
              aria-hidden="true"
            >
              ▾
            </span>
          </span>
        </button>
      </div>

      <Show when={props.expanded}>
        <div
          id={panelId()}
          role="region"
          aria-label={`${props.todo.title} details`}
          class="animate-fade-in-up border-t border-border/60 px-4 pb-3 pt-3"
        >
          <TodoDetailPanel
            todo={props.todo}
            onDelete={props.actions.onDelete}
            onEdit={props.actions.onEdit}
          />
          <div class="my-3 border-t border-border/60" />
          <h3 class="mb-2 font-display text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Comments
          </h3>
          <CommentThread
            todo={props.todo}
            me={props.me}
            onRemoveComment={(id) =>
              props.actions.onRemoveComment(props.todo, id)
            }
          />
          <CommentComposer
            me={props.me}
            onSend={(body) => props.actions.onAddComment(props.todo, body)}
          />
        </div>
      </Show>
    </li>
  );
};
