import { type ComponentProps, type JSX, splitProps } from 'solid-js';
import { Dialog as KDialog } from '@kobalte/core/dialog';
import { cn } from '@/lib/cn';

export const Dialog = KDialog;
export const DialogTrigger = KDialog.Trigger;

/**
 * Modal sheet: anchored to the bottom on phones (thumb reach), centred on
 * wider screens. Kobalte handles focus trapping, Escape and outside clicks.
 */
export function DialogContent(
  props: ComponentProps<typeof KDialog.Content> & { children?: JSX.Element },
) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <KDialog.Portal>
      <KDialog.Overlay class="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px]" />
      <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <KDialog.Content
          class={cn(
            'animate-fade-in-up w-full max-w-xl rounded-t-2xl border border-border/70 bg-card',
            'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-card-foreground shadow-cosy-lg',
            'outline-none sm:max-w-md sm:rounded-2xl',
            local.class,
          )}
          {...rest}
        >
          {local.children}
        </KDialog.Content>
      </div>
    </KDialog.Portal>
  );
}

export function DialogTitle(props: ComponentProps<typeof KDialog.Title>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KDialog.Title
      class={cn('font-display text-lg font-extrabold', local.class)}
      {...rest}
    />
  );
}

export function DialogDescription(
  props: ComponentProps<typeof KDialog.Description>,
) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KDialog.Description
      class={cn('text-sm text-muted-foreground', local.class)}
      {...rest}
    />
  );
}

export const DialogCloseButton = KDialog.CloseButton;
