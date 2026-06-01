import { type Component, type JSX, For, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '@/features/auth/auth-context';
import { useFamily } from '@/features/family/family-context';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/groceries', label: 'Groceries', icon: '🧺' },
  { href: '/todos', label: 'To-dos', icon: '✅' },
  { href: '/spark', label: 'Spark', icon: '✨' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/chat', label: 'Chat', icon: '💬' },
] as const;

/** Persistent warm chrome shared by every family view. */
export const AppShell: Component<{ children?: JSX.Element }> = (props) => {
  const location = useLocation();
  const { logout } = useAuth();
  const { currentMember } = useFamily();

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
        <div class="flex items-center gap-1.5">
          <Show when={currentMember()}>
            {(m) => (
              <div
                class="flex items-center gap-2 rounded-full border border-border/70 bg-card py-1 pl-1 pr-2.5 shadow-cosy"
                aria-label={`Signed in as ${m().name}`}
              >
                <Avatar name={m().name} color={m().color} size="sm" />
                <span class="text-sm font-bold">{m().name}</span>
              </div>
            )}
          </Show>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 text-muted-foreground"
            aria-label="Sign out"
            onClick={() => logout()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </Button>
        </div>
      </header>

      <main class="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        {props.children}
      </main>

      <nav
        class="fixed bottom-0 left-1/2 z-20 grid w-full max-w-xl -translate-x-1/2 grid-cols-5 gap-1 border-t border-border/60 bg-card/85 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
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
                    active() ? '-translate-y-0.5 scale-110' : 'grayscale-[0.4]',
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
