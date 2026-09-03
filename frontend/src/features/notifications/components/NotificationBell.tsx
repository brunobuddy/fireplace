import { type Component, Show, createSignal, onMount } from 'solid-js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  type PushState,
  currentPushState,
  disablePush,
  enablePush,
} from '../push';

const LABEL: Record<Exclude<PushState, 'hidden'>, string> = {
  off: 'Activer les notifications',
  on: 'Désactiver les notifications',
  denied: 'Notifications bloquées par le navigateur',
};

/**
 * Header toggle for Web Push. Hidden when the deployment can't push (no
 * service worker in dev, no VAPID keys, unsupported browser); disabled when
 * the user blocked notifications at the browser level — only they can undo
 * that, from the site settings.
 */
export const NotificationBell: Component = () => {
  const [state, setState] = createSignal<PushState>('hidden');
  const [busy, setBusy] = createSignal(false);

  onMount(() => {
    void currentPushState().then(setState);
  });

  const toggle = async (): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      setState(state() === 'on' ? await disablePush() : await enablePush());
    } catch {
      // Push is a nicety — a failed toggle must never break the header.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Show when={state() !== 'hidden'}>
      <Button
        variant="ghost"
        size="icon"
        class={cn(
          'h-9 w-9',
          state() === 'on' ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-label={LABEL[state() as Exclude<PushState, 'hidden'>]}
        aria-pressed={state() === 'on'}
        disabled={state() === 'denied' || busy()}
        onClick={() => void toggle()}
      >
        <svg
          viewBox="0 0 24 24"
          fill={state() === 'on' ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          <Show when={state() === 'denied'}>
            <line x1="2" y1="2" x2="22" y2="22" />
          </Show>
        </svg>
      </Button>
    </Show>
  );
};
