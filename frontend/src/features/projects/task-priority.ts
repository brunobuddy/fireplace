import type { ProjectTaskPriority } from '@/lib/types';

/**
 * One place that maps each task priority to its warm, scannable look — the
 * same recipe as the to-do criticalities, with a fourth level on top:
 * `blocking`, the step the whole project is stuck on. It borrows the
 * terracotta primary (warm-urgent, not an alarming red), pushing `high` down
 * to the honey accent.
 */
export interface PriorityMeta {
  value: ProjectTaskPriority;
  label: string;
  icon: string;
  badge: 'default' | 'accent' | 'muted';
  bar: string;
  selected: string;
}

export const PRIORITY: Record<ProjectTaskPriority, PriorityMeta> = {
  blocking: {
    value: 'blocking',
    label: 'Bloquant',
    icon: '🚧',
    badge: 'default',
    bar: 'before:bg-primary',
    selected: 'bg-primary/15 text-primary',
  },
  high: {
    value: 'high',
    label: 'Haute',
    icon: '🔥',
    badge: 'accent',
    bar: 'before:bg-accent',
    selected: 'bg-accent/30 text-accent-foreground',
  },
  medium: {
    value: 'medium',
    label: 'Moyenne',
    icon: '☀️',
    badge: 'muted',
    bar: 'before:bg-border',
    selected: 'bg-muted text-foreground',
  },
  low: {
    value: 'low',
    label: 'Basse',
    icon: '🌱',
    badge: 'muted',
    bar: 'before:bg-transparent',
    selected: 'bg-muted text-muted-foreground',
  },
};

/** Display order: most pressing first. */
export const PRIORITY_ORDER: ProjectTaskPriority[] = [
  'blocking',
  'high',
  'medium',
  'low',
];

/** Only the loud levels get a pill on the row — medium is the quiet default. */
export const showsPriorityBadge = (priority: ProjectTaskPriority): boolean =>
  priority === 'blocking' || priority === 'high';
