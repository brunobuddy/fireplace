import { type ComponentProps, splitProps } from 'solid-js';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-bold transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary/12 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        accent: 'bg-accent/25 text-accent-foreground',
        success: 'bg-success/15 text-success',
        muted: 'bg-muted text-muted-foreground',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[0.68rem]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>;

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'size']);
  return (
    <span
      class={cn(
        badgeVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      {...rest}
    />
  );
}
