import { type Component, For, Show } from 'solid-js';
import type { SparkParticipantView } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/shared/ui/Avatar';

/** Both answers, side by side, once the pair is revealed. */
export const RevealedAnswers: Component<{
  participants: SparkParticipantView[];
}> = (props) => (
  <div class="flex flex-col gap-3">
    <p class="animate-pop-in text-center font-display text-lg font-extrabold text-success">
      Vous avez répondu tous les deux ! 💞
    </p>
    <For each={props.participants}>
      {(participant) => (
        <Card class="p-4">
          <div class="mb-2 flex items-center gap-2">
            <Avatar
              name={participant.name}
              color={participant.color}
              size="sm"
            />
            <span class="text-sm font-bold">
              {participant.name}
              <Show when={participant.isViewer}>
                <span class="font-normal text-muted-foreground"> (toi)</span>
              </Show>
            </span>
          </div>
          <p class="whitespace-pre-wrap text-sm leading-relaxed">
            {participant.text}
          </p>
        </Card>
      )}
    </For>
  </div>
);
