import { type Component } from 'solid-js';

export const Spinner: Component<{ label?: string }> = (props) => (
  <div
    class="flex flex-col items-center gap-3 py-16 text-muted-foreground"
    role="status"
    aria-live="polite"
  >
    <span class="h-7 w-7 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
    <span class="text-sm font-semibold">{props.label ?? 'Loading…'}</span>
  </div>
);
