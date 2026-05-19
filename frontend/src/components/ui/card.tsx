import { type ComponentProps, splitProps } from 'solid-js';
import { cn } from '@/lib/cn';

export function Card(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div
      class={cn(
        'rounded-xl border border-border/70 bg-card text-card-foreground shadow-cosy',
        local.class,
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <div class={cn('flex flex-col gap-1 p-5', local.class)} {...rest} />
  );
}

export function CardTitle(props: ComponentProps<'h2'>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <h2
      class={cn(
        'font-display text-lg font-bold tracking-tight',
        local.class,
      )}
      {...rest}
    />
  );
}

export function CardContent(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={cn('p-5 pt-0', local.class)} {...rest} />;
}
