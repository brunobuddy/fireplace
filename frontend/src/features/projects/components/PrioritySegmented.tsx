import { type Component, For } from 'solid-js';
import type { ProjectTaskPriority } from '@/lib/types';
import { cn } from '@/lib/cn';
import { PRIORITY, PRIORITY_ORDER } from '../task-priority';

interface Props {
  value: ProjectTaskPriority;
  onChange: (value: ProjectTaskPriority) => void;
  label?: string;
}

/**
 * One-tap, always-visible priority picker (an accessible radiogroup) — the
 * to-do board's segmented control with the fourth `Bloquant` notch.
 */
export const PrioritySegmented: Component<Props> = (props) => (
  <div
    role="radiogroup"
    aria-label={props.label ?? 'Priorité'}
    class="grid grid-cols-4 gap-1 rounded-full border border-border bg-card p-1 shadow-cosy"
  >
    <For each={PRIORITY_ORDER}>
      {(level) => {
        const meta = PRIORITY[level];
        const active = (): boolean => props.value === level;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active()}
            onClick={() => props.onChange(level)}
            class={cn(
              'flex h-9 items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1 text-[0.68rem] font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:gap-1 sm:text-sm',
              active()
                ? cn(meta.selected, 'shadow-cosy')
                : 'text-muted-foreground active:bg-muted',
            )}
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        );
      }}
    </For>
  </div>
);
