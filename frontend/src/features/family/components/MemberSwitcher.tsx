import { type Component, For, Show } from 'solid-js';
import { Avatar } from '@/shared/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFamily } from '../family-context';

/** "Who's shopping" — pick a family profile (no passwords). */
export const MemberSwitcher: Component = () => {
  const { members, currentMember, selectMember } = useFamily();

  return (
    <DropdownMenu gutter={8}>
      <DropdownMenuTrigger
        class="flex items-center gap-2 rounded-full border border-border/70 bg-card py-1 pl-1 pr-2.5 shadow-cosy transition-transform active:scale-[0.97]"
        aria-label="Switch profile"
      >
        <Show
          when={currentMember()}
          fallback={
            <span class="px-2 text-sm font-bold">Choose profile</span>
          }
        >
          {(m) => (
            <>
              <Avatar name={m().name} color={m().color} size="sm" />
              <span class="text-sm font-bold">{m().name}</span>
            </>
          )}
        </Show>
        <span class="text-[0.6rem] text-muted-foreground" aria-hidden="true">
          ▼
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <p class="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Who's shopping?
        </p>
        <For each={members()}>
          {(m) => (
            <DropdownMenuItem
              onSelect={() => selectMember(m.id)}
              class={
                m.id === currentMember()?.id
                  ? 'bg-primary/12 font-bold text-primary'
                  : ''
              }
            >
              <Avatar name={m.name} color={m.color} size="sm" />
              <span>{m.name}</span>
              <span class="ml-auto text-[0.68rem] capitalize text-muted-foreground">
                {m.role}
              </span>
            </DropdownMenuItem>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
