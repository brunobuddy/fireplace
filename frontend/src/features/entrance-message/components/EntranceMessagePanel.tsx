import { type Component, Show, createSignal } from 'solid-js';
import type { EntranceMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/cn';
import {
  ENTRANCE_MESSAGE_MAX_LENGTH,
  canPublish,
  remainingChars,
} from '../store/entrance-message.helpers';

interface Props {
  message: EntranceMessage | null;
  saving: boolean;
  onPublish: (text: string) => void;
  onClear: () => void;
}

/**
 * Body of the entrance-message sheet: what the screen by the door shows now,
 * and a composer to replace it. The draft is seeded with the current text so
 * a typo is one edit away; the sheet remounts on every open.
 */
export const EntranceMessagePanel: Component<Props> = (props) => {
  // Seeded once on purpose — a realtime update must not reset a draft mid-edit.
  // eslint-disable-next-line solid/reactivity
  const [draft, setDraft] = createSignal(props.message?.text ?? '');
  const remaining = (): number => remainingChars(draft());

  const submit = (e: Event): void => {
    e.preventDefault();
    if (props.saving || !canPublish(draft(), props.message)) return;
    props.onPublish(draft());
  };

  return (
    <div class="mt-3 flex flex-col gap-4">
      <CurrentMessage message={props.message} />

      <form class="flex flex-col gap-2" onSubmit={submit}>
        <label for="entrance-message-draft" class="text-sm font-bold">
          Nouveau message
        </label>
        <Textarea
          id="entrance-message-draft"
          rows={4}
          maxLength={ENTRANCE_MESSAGE_MAX_LENGTH}
          placeholder="Ex. : Les clés sont chez la voisine 🔑"
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          aria-describedby="entrance-message-counter"
        />
        <CharCounter remaining={remaining()} />
        <PanelActions
          hasMessage={props.message !== null}
          saving={props.saving}
          canSubmit={canPublish(draft(), props.message)}
          onClear={() => props.onClear()}
        />
      </form>
    </div>
  );
};

const CurrentMessage: Component<{ message: EntranceMessage | null }> = (
  props,
) => (
  <Show
    when={props.message}
    fallback={
      <p class="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
        Aucun message affiché pour l’instant.
      </p>
    }
  >
    {(message) => (
      <figure class="rounded-xl border border-border/70 bg-background px-4 py-3 shadow-cosy">
        <blockquote class="whitespace-pre-wrap break-words text-base font-semibold leading-snug">
          {message().text}
        </blockquote>
        <figcaption class="mt-2 text-xs text-muted-foreground">
          par {message().authorName ?? 'Quelqu’un'} ·{' '}
          {relativeTime(message().updatedAt)}
        </figcaption>
      </figure>
    )}
  </Show>
);

const CharCounter: Component<{ remaining: number }> = (props) => (
  <p
    id="entrance-message-counter"
    aria-live="polite"
    class={cn(
      'text-right text-xs font-semibold tabular-nums',
      props.remaining < 0
        ? 'text-destructive'
        : props.remaining <= 20
          ? 'text-accent-foreground'
          : 'text-muted-foreground',
    )}
  >
    {ENTRANCE_MESSAGE_MAX_LENGTH - props.remaining} /{' '}
    {ENTRANCE_MESSAGE_MAX_LENGTH}
  </p>
);

const PanelActions: Component<{
  hasMessage: boolean;
  saving: boolean;
  canSubmit: boolean;
  onClear: () => void;
}> = (props) => (
  <div class="flex gap-2">
    <Show when={props.hasMessage}>
      <Button
        type="button"
        variant="ghost"
        class="flex-1 text-destructive"
        disabled={props.saving}
        onClick={() => props.onClear()}
      >
        Effacer
      </Button>
    </Show>
    <Button
      type="submit"
      class="flex-[2]"
      disabled={props.saving || !props.canSubmit}
    >
      Afficher sur l’entrée
    </Button>
  </div>
);
