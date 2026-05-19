import { type ComponentProps, splitProps } from 'solid-js';
import { DropdownMenu as KDropdownMenu } from '@kobalte/core/dropdown-menu';
import { cn } from '@/lib/cn';

export const DropdownMenu = KDropdownMenu;
export const DropdownMenuTrigger = KDropdownMenu.Trigger;

export function DropdownMenuContent(
  props: ComponentProps<typeof KDropdownMenu.Content>,
) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KDropdownMenu.Portal>
      <KDropdownMenu.Content
        class={cn(
          'z-50 min-w-[13rem] origin-[var(--kb-menu-content-transform-origin)]',
          'rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground',
          'shadow-cosy-lg animate-content-show',
          local.class,
        )}
        {...rest}
      />
    </KDropdownMenu.Portal>
  );
}

export function DropdownMenuItem(
  props: ComponentProps<typeof KDropdownMenu.Item>,
) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KDropdownMenu.Item
      class={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none',
        'transition-colors focus:bg-muted data-[highlighted]:bg-muted',
        local.class,
      )}
      {...rest}
    />
  );
}
