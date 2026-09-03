import { type Component, Show } from 'solid-js';
import type { LostObject, Member } from '@/lib/types';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/relative-time';
import { commentCount } from '../store/lost-objects.helpers';
import type { LostObjectActions } from '../store/lost-objects-store';
import { LostObjectComments } from './LostObjectComments';

interface Props {
  object: LostObject;
  me: Member | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  actions: LostObjectActions;
}

/**
 * One accordion item. The check circle is the only "found" control (an easy
 * mis-tap shouldn't archive the search); tapping the body opens the thread
 * where the family suggests where to look; the trash deletes.
 */
export const LostObjectRow: Component<Props> = (props) => {
  const found = (): boolean => props.object.status === 'found';
  const comments = (): number => commentCount(props.object);
  const panelId = (): string => `lost-object-panel-${props.object.id}`;

  const subtitle = (): string => {
    if (found()) {
      const by = props.object.foundBy?.name;
      const when = props.object.foundAt
        ? ` ${relativeTime(props.object.foundAt)}`
        : '';
      return by ? `Retrouvé par ${by}${when}` : `Retrouvé${when}`;
    }
    const by = props.object.reportedBy?.name;
    const when = relativeTime(props.object.createdAt);
    return by ? `Perdu · signalé par ${by} ${when}` : `Perdu ${when}`;
  };

  return (
    <li
      class={cn(
        'flex animate-fade-in-up flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-cosy transition-all',
        found() && 'opacity-65',
      )}
    >
      <div class="flex items-stretch">
        <button
          class="flex min-h-[3.5rem] items-center justify-center pl-3.5 pr-2 active:bg-muted/60"
          onClick={() => props.actions.onToggleFound(props.object)}
          aria-pressed={found()}
          aria-label={`${found() ? 'Marquer comme perdu' : 'Marquer comme retrouvé'} : ${props.object.name}`}
        >
          <span
            class={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
              found()
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
          class="flex min-h-[3.5rem] flex-1 items-center gap-3 py-3 pr-2 text-left active:bg-muted/40"
          onClick={() => props.onToggleExpand()}
          aria-expanded={props.expanded}
          aria-controls={panelId()}
          aria-label={`${props.expanded ? 'Réduire' : 'Ouvrir'} ${props.object.name}`}
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class={cn(
                'truncate font-bold',
                found() &&
                  'text-muted-foreground line-through decoration-muted-foreground/60',
              )}
            >
              {props.object.name}
            </span>
            <span class="truncate text-xs text-muted-foreground">
              {subtitle()}
            </span>
          </span>

          <span class="flex flex-shrink-0 items-center gap-2">
            <Show when={comments() > 0}>
              <span
                class="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground"
                aria-label={`${comments()} ${comments() === 1 ? 'suggestion' : 'suggestions'}`}
              >
                <span aria-hidden="true">💬</span> {comments()}
              </span>
            </Show>
            <Show
              when={found() ? props.object.foundBy : props.object.reportedBy}
            >
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

        <button
          class="flex items-center px-4 text-muted-foreground transition-colors active:bg-muted active:text-destructive"
          onClick={() => props.actions.onRemove(props.object)}
          aria-label={`Retirer ${props.object.name}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M6 7h12M9 7V5h6v2m-7 0 1 13h6l1-13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <Show when={props.expanded}>
        <div
          id={panelId()}
          role="region"
          aria-label={`Suggestions pour ${props.object.name}`}
          class="animate-fade-in-up border-t border-border/60 px-4 pb-3 pt-3"
        >
          <h3 class="mb-2 font-display text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Où chercher ?
          </h3>
          <LostObjectComments
            object={props.object}
            me={props.me}
            onAddComment={(body) =>
              props.actions.onAddComment(props.object, body)
            }
            onRemoveComment={(id) =>
              props.actions.onRemoveComment(props.object, id)
            }
          />
        </div>
      </Show>
    </li>
  );
};
