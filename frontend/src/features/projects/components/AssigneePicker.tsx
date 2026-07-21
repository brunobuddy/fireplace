import { type Component, For } from 'solid-js';
import type { Member } from '@/lib/types';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/lib/cn';

interface Props {
  members: Member[];
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}

const optionClass = (active: boolean): string =>
  cn(
    'flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-xs font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
    active
      ? 'bg-muted text-foreground shadow-cosy'
      : 'text-muted-foreground active:bg-muted',
  );

/**
 * Pick the one member responsible for a task — or nobody. Same segmented
 * radiogroup pattern as the priority picker, built from the household.
 */
export const AssigneePicker: Component<Props> = (props) => (
  <div
    role="radiogroup"
    aria-label={props.label ?? 'Responsable'}
    class="grid gap-1 rounded-full border border-border bg-card p-1 shadow-cosy"
    style={{
      'grid-template-columns': `repeat(${props.members.length + 1}, minmax(0, 1fr))`,
    }}
  >
    <button
      type="button"
      role="radio"
      aria-checked={props.value === null}
      onClick={() => props.onChange(null)}
      class={optionClass(props.value === null)}
    >
      <span aria-hidden="true">🙅</span>
      <span>Personne</span>
    </button>
    <For each={props.members}>
      {(member) => {
        const active = (): boolean => props.value === member.id;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active()}
            onClick={() => props.onChange(member.id)}
            class={optionClass(active())}
          >
            <Avatar name={member.name} color={member.color} size="sm" />
            <span class="truncate">{member.name}</span>
          </button>
        );
      }}
    </For>
  </div>
);
