import { type Component, For, Show } from 'solid-js';
import type { Member, Todo } from '@/lib/types';
import { Avatar } from '@/shared/ui/Avatar';
import { relativeTime, sortComments } from '../store/todos.helpers';

interface Props {
  todo: Todo;
  me: Member | undefined;
  onRemoveComment: (commentId: string) => void;
}

/** The conversation under a to-do — who said what, and when. */
export const CommentThread: Component<Props> = (props) => {
  const comments = () => sortComments(props.todo.comments);

  return (
    <Show
      when={comments().length > 0}
      fallback={
        <div class="flex flex-col items-center gap-1 py-8 text-center">
          <div class="animate-float text-4xl" aria-hidden="true">
            💬
          </div>
          <p class="text-sm font-bold">No comments yet</p>
          <p class="max-w-[24ch] text-xs text-muted-foreground">
            Be the first to add a note — ask a question, drop a link, or cheer
            it on. 🎉
          </p>
        </div>
      }
    >
      <ul class="space-y-3">
        <For each={comments()}>
          {(comment) => (
            <li class="flex gap-2.5">
              <Show when={comment.author}>
                {(a) => <Avatar name={a().name} color={a().color} size="sm" />}
              </Show>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-bold">
                    {comment.author?.name ?? 'Someone'}
                  </span>
                  <span class="text-[0.68rem] text-muted-foreground">
                    {relativeTime(comment.createdAt)}
                  </span>
                  <Show when={props.me && comment.authorId === props.me.id}>
                    <button
                      type="button"
                      onClick={() => props.onRemoveComment(comment.id)}
                      class="-my-1 ml-auto inline-flex min-h-[2rem] items-center rounded px-2 text-xs font-bold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-destructive"
                      aria-label="Delete comment"
                    >
                      Delete
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
  );
};
