import { type Component, For } from 'solid-js';
import type { TodoCriticality } from '@/lib/types';
import { cn } from '@/lib/cn';
import { CRITICALITY, CRITICALITY_ORDER } from '../todo-criticality';

interface Props {
  value: TodoCriticality;
  onChange: (value: TodoCriticality) => void;
  label?: string;
}

/** One-tap, always-visible priority picker (an accessible radiogroup). */
export const CriticalitySegmented: Component<Props> = (props) => (
  <div
    role="radiogroup"
    aria-label={props.label ?? 'Priorité'}
    class="grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1 shadow-cosy"
  >
    <For each={CRITICALITY_ORDER}>
      {(level) => {
        const meta = CRITICALITY[level];
        const active = (): boolean => props.value === level;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active()}
            onClick={() => props.onChange(level)}
            class={cn(
              'flex h-9 items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1 text-xs font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:gap-1 sm:text-sm',
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
