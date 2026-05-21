import { type Component, type JSX, For } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { MemberSwitcher } from '@/features/family/components/MemberSwitcher';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/groceries', label: 'Groceries', icon: '🧺' },
  { href: '/todos', label: 'To-dos', icon: '✅' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/chat', label: 'Chat', icon: '💬' },
] as const;

/** Persistent warm chrome shared by every family view. */
export const AppShell: Component<{ children?: JSX.Element }> = (props) => {
  const location = useLocation();

  return (
    <div class="mx-auto flex min-h-full max-w-xl flex-col">
      <header class="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div class="flex items-center gap-2">
          <span class="text-2xl" aria-hidden="true">
            🔥
          </span>
          <span class="font-display text-xl font-extrabold tracking-tight">
            Fireplace
          </span>
        </div>
        <MemberSwitcher />
      </header>

      <main class="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        {props.children}
      </main>

      <nav
        class="fixed bottom-0 left-1/2 z-20 grid w-full max-w-xl -translate-x-1/2 grid-cols-4 gap-1 border-t border-border/60 bg-card/85 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
        aria-label="Family sections"
      >
        <For each={NAV}>
          {(tab) => {
            const active = (): boolean =>
              location.pathname.startsWith(tab.href);
            return (
              <A
                href={tab.href}
                class={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg py-2 transition-colors',
                  active()
                    ? 'text-primary'
                    : 'text-muted-foreground active:bg-muted',
                )}
              >
                <span
                  class={cn(
                    'text-[1.4rem] transition-transform duration-150',
                    active()
                      ? '-translate-y-0.5 scale-110'
                      : 'grayscale-[0.4]',
                  )}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span class="text-[0.68rem] font-bold">{tab.label}</span>
              </A>
            );
          }}
        </For>
      </nav>
    </div>
  );
};
