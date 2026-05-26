import { type Component, Show, createSignal } from 'solid-js';
import type { SparkParticipantView } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  partner?: SparkParticipantView;
  onSubmit: (text: string) => void;
}

/** Where a parent types their secret answer. Shows the partner's status (but
 *  never their text) so you know whether you're the first or second to answer. */
export const AnswerComposer: Component<Props> = (props) => {
  const [text, setText] = createSignal('');

  const submit = (event: Event): void => {
    event.preventDefault();
    const trimmed = text().trim();
    if (!trimmed) return;
    props.onSubmit(trimmed);
    setText('');
  };

  return (
    <form onSubmit={submit} class="flex flex-col gap-3">
      <PartnerStatus partner={props.partner} />
      <label for="spark-answer" class="sr-only">
        Your secret answer
      </label>
      <Textarea
        id="spark-answer"
        rows={4}
        placeholder="Type your answer… it stays hidden until you’ve both answered 🔒"
        value={text()}
        onInput={(event) => setText(event.currentTarget.value)}
      />
      <Button type="submit" disabled={!text().trim()} class="self-end">
        Share secretly 🔒
      </Button>
    </form>
  );
};

const PartnerStatus: Component<{ partner?: SparkParticipantView }> = (
  props,
) => (
  <Show when={props.partner}>
    {(partner) => (
      <p class="text-sm leading-relaxed text-muted-foreground">
        <Show
          when={partner().hasAnswered}
          fallback={
            <>
              <b class="text-foreground">{partner().name}</b> hasn’t answered
              yet — yours stays hidden until you both have.
            </>
          }
        >
          <b class="text-foreground">{partner().name}</b> has already answered
          🔒 — add yours to reveal both.
        </Show>
      </p>
    )}
  </Show>
);
