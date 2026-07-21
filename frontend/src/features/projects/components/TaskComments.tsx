import { type Component, For, Show, createSignal } from 'solid-js';
import type { Member, ProjectTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/shared/ui/Avatar';
import { relativeTime } from '@/lib/relative-time';
import { sortComments } from '../store/projects.helpers';

interface Props {
  task: ProjectTask;
  me: Member | undefined;
  onAddComment: (body: string) => void;
  onRemoveComment: (commentId: string) => void;
}

/** The conversation under a task — who said what — plus its composer. */
export const TaskComments: Component<Props> = (props) => {
  const comments = () => sortComments(props.task.comments);
  const [body, setBody] = createSignal('');

  const send = (): void => {
    const trimmed = body().trim();
    if (!trimmed) return;
    props.onAddComment(trimmed);
    setBody('');
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <h4 class="mb-2 font-display text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        Commentaires
      </h4>
      <Show
        when={comments().length > 0}
        fallback={
          <p class="pb-2 text-xs text-muted-foreground">
            Pas encore de commentaires — pose une question ou laisse un mot. 💬
          </p>
        }
      >
        <ul class="mb-3 space-y-3">
          <For each={comments()}>
            {(comment) => (
              <li class="flex gap-2.5">
                <Show when={comment.author}>
                  {(a) => (
                    <Avatar name={a().name} color={a().color} size="sm" />
                  )}
                </Show>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2">
                    <span class="text-sm font-bold">
                      {comment.author?.name ?? 'Quelqu’un'}
                    </span>
                    <span class="text-[0.68rem] text-muted-foreground">
                      {relativeTime(comment.createdAt)}
                    </span>
                    <Show when={props.me && comment.authorId === props.me.id}>
                      <button
                        type="button"
                        onClick={() => props.onRemoveComment(comment.id)}
                        class="-my-1 ml-auto inline-flex min-h-[2rem] items-center rounded px-2 text-xs font-bold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-destructive"
                        aria-label="Supprimer le commentaire"
                      >
                        Supprimer
                      </button>
                    </Show>
                  </div>
                  <p class="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                    {comment.body}
                  </p>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <form
        class="border-t border-border/60 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div class="flex items-end gap-2">
          <Show when={props.me}>
            {(m) => <Avatar name={m().name} color={m().color} size="sm" />}
          </Show>
          <Textarea
            rows={1}
            value={body()}
            onInput={(e) => setBody(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Ajouter un commentaire…"
            enterkeyhint="send"
            aria-label="Écrire un commentaire"
            class="max-h-28 flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!body().trim()}
            aria-label="Envoyer le commentaire"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
              <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
            </svg>
          </Button>
        </div>
      </form>
    </>
  );
};
