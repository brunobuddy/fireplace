import { type Component } from 'solid-js';

export const EmptyState: Component = () => (
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      🧺
    </div>
    <h2 class="font-display text-lg font-extrabold">The list is empty</h2>
    <p class="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
      Add what you need above — everyone in the family sees it instantly. 🏡
    </p>
  </div>
);
