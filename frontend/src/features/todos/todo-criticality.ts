import type { TodoCriticality } from '@/lib/types';

/**
 * One place that maps each criticality level (low / medium / high) to its
 * warm, scannable look: a left accent bar on the row, a Badge variant for
 * the pill, an emoji, and the fill used when it's selected in the segmented
 * picker. Kept calm — `high` borrows the terracotta primary (warm-urgent),
 * not an alarming red (red stays reserved for destructive actions).
 */
export interface CriticalityMeta {
  value: TodoCriticality;
  label: string;
  icon: string;
  badge: 'default' | 'accent' | 'muted';
  bar: string;
  selected: string;
}

export const CRITICALITY: Record<TodoCriticality, CriticalityMeta> = {
  high: {
    value: 'high',
    label: 'Haute',
    icon: '🔥',
    badge: 'default',
    bar: 'before:bg-primary',
    selected: 'bg-primary/15 text-primary',
  },
  medium: {
    value: 'medium',
    label: 'Moyenne',
    icon: '☀️',
    badge: 'accent',
    bar: 'before:bg-accent',
    selected: 'bg-accent/30 text-accent-foreground',
  },
  low: {
    value: 'low',
    label: 'Basse',
    icon: '🌱',
    badge: 'muted',
    bar: 'before:bg-border',
    selected: 'bg-muted text-foreground',
  },
};

/** Display order: most critical first. */
export const CRITICALITY_ORDER: TodoCriticality[] = ['high', 'medium', 'low'];
