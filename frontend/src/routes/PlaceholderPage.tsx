import { type Component } from 'solid-js';

/** Stand-in for the family views still to come (Agenda, Chat, …). */
export const PlaceholderPage: Component<{ title: string; icon: string }> = (
  props,
) => (
  <div class="flex flex-col items-center px-6 py-16 text-center">
    <div class="mb-3 animate-float text-6xl" aria-hidden="true">
      {props.icon}
    </div>
    <h1 class="font-display text-xl font-extrabold">{props.title}</h1>
    <p class="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
      Coming soon — a cosy spot for the family {props.title.toLowerCase()},
      built on the same warm foundation as the grocery list. 🏡
    </p>
  </div>
);
