import { Progress as KProgress } from '@kobalte/core/progress';
import { cn } from '@/lib/cn';

interface ProgressProps {
  value: number;
  class?: string;
}

/** Slim cosy progress meter (Kobalte Progress, 0–100). */
export function Progress(props: ProgressProps) {
  return (
    <KProgress
      value={props.value}
      minValue={0}
      maxValue={100}
      class={cn('w-full', props.class)}
    >
      <KProgress.Track class="h-2.5 overflow-hidden rounded-full bg-muted">
        <KProgress.Fill
          class="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500 ease-out"
          style={{ width: `var(--kb-progress-fill-width)` }}
        />
      </KProgress.Track>
    </KProgress>
  );
}
