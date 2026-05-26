import { type Component, Show, createEffect, onCleanup } from 'solid-js';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6000;

/**
 * Transient error banner for actions that fail without taking over the screen —
 * a failed answer, "New question", add-item, toggle, etc. Pinned just above the
 * bottom nav; it auto-dismisses and can be tapped away. The full-page "couldn't
 * load" state stays separate, so a one-off failure never blanks the UI.
 */
export const ErrorToast: Component<Props> = (props) => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    clearTimeout(timer);
    if (props.message) {
      timer = setTimeout(() => props.onDismiss(), AUTO_DISMISS_MS);
    }
  });
  onCleanup(() => clearTimeout(timer));

  return (
    <Show when={props.message}>
      {(message) => (
        <div
          role="alert"
          aria-live="assertive"
          class="animate-pop-in fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(32rem,calc(100%-1.5rem))] -translate-x-1/2 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive px-4 py-3 text-destructive-foreground shadow-cosy"
        >
          <span class="text-lg leading-none" aria-hidden="true">
            ⚠️
          </span>
          <p class="flex-1 text-sm font-semibold leading-snug">{message()}</p>
          <button
            type="button"
            onClick={() => props.onDismiss()}
            aria-label="Dismiss"
            class="-mr-1 rounded-md px-1.5 text-lg leading-none text-destructive-foreground/80 transition-colors hover:text-destructive-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </Show>
  );
};
