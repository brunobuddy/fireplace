import { type ComponentProps, splitProps } from 'solid-js';
import { TextField as KTextField } from '@kobalte/core/text-field';
import { cn } from '@/lib/cn';

/** Kobalte TextField root — owns value/label wiring + a11y. */
export function TextField(props: ComponentProps<typeof KTextField>) {
  const [local, rest] = splitProps(props, ['class']);
  return <KTextField class={cn('flex flex-col gap-1.5', local.class)} {...rest} />;
}

export function TextFieldInput(
  props: ComponentProps<typeof KTextField.Input>,
) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KTextField.Input
      class={cn(
        'h-11 w-full rounded-lg border border-input bg-card px-4 text-sm',
        'placeholder:text-muted-foreground shadow-cosy transition-shadow',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50',
        local.class,
      )}
      {...rest}
    />
  );
}

export function TextFieldLabel(
  props: ComponentProps<typeof KTextField.Label>,
) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <KTextField.Label
      class={cn('text-sm font-semibold text-foreground', local.class)}
      {...rest}
    />
  );
}
