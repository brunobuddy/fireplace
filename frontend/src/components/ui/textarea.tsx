import { type ComponentProps, splitProps } from 'solid-js';
import { cn } from '@/lib/cn';

/** Styled textarea matching TextFieldInput — used for comments and notes. */
export function Textarea(props: ComponentProps<'textarea'>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <textarea
      class={cn(
        'w-full resize-none rounded-lg border border-input bg-card px-4 py-2.5 text-sm',
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
