import { type Component, For, Show, createSignal } from 'solid-js';
import type { SparkParticipantView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/shared/ui/Avatar';

/** One-line intro under the page header. */
export const SparkIntro: Component = () => (
  <p class="text-sm leading-relaxed text-muted-foreground">
    A daily question, just for the two of you. Answer in private — you’ll each
    see the other’s reply only once you’ve both answered. ✨
  </p>
);

export const SparkError: Component<{
  message: string | null;
  onRetry: () => void;
}> = (props) => (
  <div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
    <p class="font-semibold text-destructive">{props.message}</p>
    <Button onClick={() => props.onRetry()}>Try again</Button>
  </div>
);

export const EmptyState: Component<{
  generating: boolean;
  onNew: () => void;
}> = (props) => (
  <div class="flex flex-col items-center px-6 py-12 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      ✨
    </div>
    <h2 class="font-display text-lg font-extrabold">No question yet</h2>
    <p class="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
      Spark a fresh question for the two of you to answer.
    </p>
    <Button
      class="mt-4"
      variant="accent"
      disabled={props.generating}
      onClick={() => props.onNew()}
    >
      {props.generating ? 'Conjuring a question…' : '✨ New question'}
    </Button>
  </div>
);

export const WaitingNote: Component<{
  me?: SparkParticipantView;
  partner?: SparkParticipantView;
}> = (props) => (
  <div class="flex flex-col gap-3">
    <Card class="border-success/40 bg-success/5 p-4">
      <p class="text-sm font-bold text-success">Your answer is locked in 🔒</p>
      <Show when={props.me?.text}>
        {(text) => (
          <p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {text()}
          </p>
        )}
      </Show>
    </Card>
    <p class="text-center text-sm leading-relaxed text-muted-foreground">
      Waiting for{' '}
      <b class="text-foreground">{props.partner?.name ?? 'your partner'}</b> to
      answer — you’ll both see each other’s answers then. ✨
    </p>
  </div>
);

export const SpectatorNote: Component<{
  participants: SparkParticipantView[];
}> = (props) => (
  <div class="flex flex-col gap-3">
    <Card class="p-4 text-center">
      <p class="text-sm leading-relaxed text-muted-foreground">
        This one’s just for the grown-ups 💞
      </p>
    </Card>
    <div class="flex items-center justify-center gap-6">
      <For each={props.participants}>
        {(participant) => (
          <div class="flex flex-col items-center gap-1.5">
            <Avatar name={participant.name} color={participant.color} />
            <span class="text-xs font-semibold text-muted-foreground">
              {participant.hasAnswered ? 'answered 🔒' : 'thinking…'}
            </span>
          </div>
        )}
      </For>
    </div>
  </div>
);

export const NewQuestionButton: Component<{
  generating: boolean;
  needsConfirm: boolean;
  onNew: () => void;
}> = (props) => {
  const [confirming, setConfirming] = createSignal(false);
  return (
    <Show
      when={!confirming()}
      fallback={
        <div class="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
          <span class="px-1 text-xs font-semibold text-muted-foreground">
            Start a new question? This clears the current answer.
          </span>
          <Button
            size="sm"
            variant="ghost"
            class="ml-auto"
            onClick={() => setConfirming(false)}
          >
            Keep it
          </Button>
          <Button
            size="sm"
            variant="accent"
            disabled={props.generating}
            onClick={() => {
              props.onNew();
              setConfirming(false);
            }}
          >
            New one
          </Button>
        </div>
      }
    >
      <Button
        variant="ghost"
        class="self-center text-muted-foreground"
        disabled={props.generating}
        onClick={() =>
          props.needsConfirm ? setConfirming(true) : props.onNew()
        }
      >
        {props.generating ? 'Conjuring a question…' : '✨ New question'}
      </Button>
    </Show>
  );
};
