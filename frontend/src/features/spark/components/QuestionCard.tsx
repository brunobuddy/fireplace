import { type Component } from 'solid-js';
import { Card } from '@/components/ui/card';

/** The day's question — public text, shown above whatever phase the viewer is in. */
export const QuestionCard: Component<{ text: string }> = (props) => (
  <Card class="relative overflow-hidden p-6">
    <div
      class="pointer-events-none absolute -right-3 -top-3 text-7xl opacity-10"
      aria-hidden="true"
    >
      ✨
    </div>
    <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      La question du jour
    </p>
    <p class="mt-2 font-display text-xl font-extrabold leading-snug">
      {props.text}
    </p>
  </Card>
);
