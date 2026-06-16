import { type Component } from 'solid-js';

export const EmptyState: Component = () => (
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-3 text-6xl" aria-hidden="true">
      🧺
    </div>
    <h2 class="font-display text-lg font-extrabold">La liste est vide</h2>
    <p class="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
      Ajoute ce qu’il te faut ci-dessus — toute la famille le voit
      instantanément. 🏡
    </p>
  </div>
);
