import { type Component, Show } from 'solid-js';
import type { Member, Project, ProjectTask } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/relative-time';
import { PRIORITY, showsPriorityBadge } from '../task-priority';
import { commentCount } from '../store/projects.helpers';
import type { ProjectItemActions } from '../store/projects-store';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskComments } from './TaskComments';

interface Props {
  project: Project;
  task: ProjectTask;
  me: Member | undefined;
  members: Member[];
  expanded: boolean;
  onToggleExpand: () => void;
  actions: ProjectItemActions;
}

/**
 * One task of a project: a tappable row (checkbox toggles done; the body
 * expands) revealing details + comments inline. The avatar on the right is
 * the *responsible* member — at a glance, who owns each step.
 */
export const TaskRow: Component<Props> = (props) => {
  const done = (): boolean => props.task.status === 'done';
  const meta = () => PRIORITY[props.task.priority];
  const bar = (): string => (done() ? 'before:bg-border' : meta().bar);
  const comments = (): number => commentCount(props.task);
  const panelId = (): string => `task-panel-${props.task.id}`;

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
          onClick={() => props.actions.onToggleTask(props.project, props.task)}
          aria-pressed={done()}
          aria-label={`${done() ? 'Marquer comme non fait' : 'Marquer comme fait'} : ${props.task.title}`}
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
          aria-label={`${props.expanded ? 'Réduire' : 'Ouvrir'} ${props.task.title}`}
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class={cn(
                'flex items-center gap-2 font-bold',
                done() &&
                  'text-muted-foreground line-through decoration-muted-foreground/60',
              )}
            >
              <span class="truncate">{props.task.title}</span>
              <Show when={!done() && showsPriorityBadge(props.task.priority)}>
                <Badge variant={meta().badge} size="sm" class="flex-shrink-0">
                  <span aria-hidden="true">{meta().icon}</span> {meta().label}
                </Badge>
              </Show>
            </span>
            <Show when={done() && props.task.completedBy}>
              {(m) => (
                <span class="truncate text-xs text-muted-foreground">
                  Fait par {m().name}
                  {props.task.completedAt
                    ? ` · ${relativeTime(props.task.completedAt)}`
                    : ''}
                </span>
              )}
            </Show>
          </span>

          <span class="flex flex-shrink-0 items-center gap-2">
            <Show when={comments() > 0}>
              <span
                class="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground"
                aria-label={`${comments()} ${comments() === 1 ? 'commentaire' : 'commentaires'}`}
              >
                <span aria-hidden="true">💬</span> {comments()}
              </span>
            </Show>
            <Show when={props.task.assignee}>
              {(m) => (
                <span title={`Responsable : ${m().name}`}>
                  <Avatar name={m().name} color={m().color} size="sm" />
                </span>
              )}
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
          aria-label={`Détails de ${props.task.title}`}
          class="animate-fade-in-up border-t border-border/60 px-4 pb-3 pt-3"
        >
          <TaskDetailPanel
            project={props.project}
            task={props.task}
            members={props.members}
            actions={props.actions}
          />
          <div class="my-3 border-t border-border/60" />
          <TaskComments
            task={props.task}
            me={props.me}
            onAddComment={(body) =>
              props.actions.onAddComment(props.project, props.task, body)
            }
            onRemoveComment={(id) =>
              props.actions.onRemoveComment(props.project, props.task, id)
            }
          />
        </div>
      </Show>
    </li>
  );
};
