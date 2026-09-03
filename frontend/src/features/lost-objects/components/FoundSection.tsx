import { type Component, For, Show, createSignal } from 'solid-js';
import type { LostObject, Member } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { LostObjectActions } from '../store/lost-objects-store';
import { LostObjectRow } from './LostObjectRow';

interface Props {
  objects: LostObject[];
  me: Member | undefined;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  actions: LostObjectActions;
}

/** Recovered objects, tucked into a collapsible block so they don't crowd. */
export const FoundSection: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <section class="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        class="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
      >
        <span class="text-lg" aria-hidden="true">
          🎉
        </span>
        <h2 class="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Retrouvés
        </h2>
        <Badge variant="muted" size="sm" class="ml-auto">
          {props.objects.length}
        </Badge>
        <span
          class={cn(
            'text-muted-foreground transition-transform',
            open() && 'rotate-180',
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <Show when={open()}>
        <ul class="flex animate-fade-in-up flex-col gap-2">
          <For each={props.objects}>
            {(object) => (
              <LostObjectRow
                object={object}
                me={props.me}
                expanded={props.expandedId === object.id}
                onToggleExpand={() => props.onToggleExpand(object.id)}
                actions={props.actions}
              />
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
};
