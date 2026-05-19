import { type Component, Show } from 'solid-js';
import { cn } from '@/lib/cn';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
}

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const sizes = {
  sm: 'h-6 w-6 text-[0.62rem]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

/** Colour-coded family member token — soft, friendly, a little glow. */
export const Avatar: Component<AvatarProps> = (props) => (
  <span
    class={cn(
      'inline-flex flex-shrink-0 select-none items-center justify-center',
      'rounded-full font-extrabold text-white shadow-cosy',
      sizes[props.size ?? 'md'],
      props.ring && 'ring-2 ring-card ring-offset-2 ring-offset-background',
    )}
    style={{
      'background-image': `linear-gradient(140deg, ${props.color}, ${props.color} 55%, rgba(0,0,0,0.16))`,
    }}
    title={props.name}
    aria-hidden="true"
  >
    <Show when={initials(props.name)} fallback="🙂">
      {initials(props.name)}
    </Show>
  </span>
);
