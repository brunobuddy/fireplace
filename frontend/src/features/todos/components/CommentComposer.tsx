import { type Component, Show, createSignal } from 'solid-js';
import type { Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/shared/ui/Avatar';

interface Props {
  me: Member | undefined;
  onSend: (body: string) => void;
}

/** Sticky composer pinned to the sheet bottom, posting as the current member. */
export const CommentComposer: Component<Props> = (props) => {
  const [body, setBody] = createSignal('');

  const send = (): void => {
    const trimmed = body().trim();
    if (!trimmed) return;
    props.onSend(trimmed);
    setBody('');
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
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
          placeholder="Add a comment…"
          enterkeyhint="send"
          aria-label="Write a comment"
          class="max-h-28 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!body().trim()}
          aria-label="Send comment"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
          </svg>
        </Button>
      </div>
    </form>
  );
};
