import { type ComponentProps, splitProps } from 'solid-js';
import { Button as KButton } from '@kobalte/core/button';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold ' +
    'transition-all duration-150 ease-out outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-cosy hover:brightness-105',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted text-foreground',
        outline:
          'border border-border bg-card hover:bg-muted text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-105',
        accent: 'bg-accent text-accent-foreground shadow-cosy hover:brightness-105',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-11 w-11',
        pill: 'h-9 rounded-full px-4 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonProps = ComponentProps<typeof KButton> &
  VariantProps<typeof buttonVariants>;

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'size']);
  return (
    <KButton
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      {...rest}
    />
  );
}
