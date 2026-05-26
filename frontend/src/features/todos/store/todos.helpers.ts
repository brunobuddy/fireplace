import type { Todo, TodoComment, TodoCriticality } from '@/lib/types';
import { CRITICALITY_ORDER } from '../todo-criticality';

/** Pure list operations — kept side-effect free so they're unit-testable. */

export function upsert(todos: Todo[], next: Todo): Todo[] {
  const idx = todos.findIndex((t) => t.id === next.id);
  if (idx === -1) {
    return [...todos, next];
  }
  const copy = todos.slice();
  copy[idx] = next;
  return copy;
}

export function removeById(todos: Todo[], id: string): Todo[] {
  return todos.filter((t) => t.id !== id);
}

export interface CriticalityGroup {
  criticality: TodoCriticality;
  todos: Todo[];
}

/**
 * Open to-dos bucketed by criticality, most pressing section first and
 * newest first within a section. Empty buckets are dropped.
 */
export function groupOpenByCriticality(todos: Todo[]): CriticalityGroup[] {
  return CRITICALITY_ORDER.map((criticality) => ({
    criticality,
    todos: todos
      .filter((t) => t.status === 'open' && t.criticality === criticality)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  })).filter((group) => group.todos.length > 0);
}

export const openCount = (todos: Todo[]): number =>
  todos.filter((t) => t.status === 'open').length;

/** Completed to-dos, most recently finished first. */
export const doneTodos = (todos: Todo[]): Todo[] =>
  todos
    .filter((t) => t.status === 'done')
    .sort((a, b) =>
      (b.completedAt ?? b.createdAt).localeCompare(
        a.completedAt ?? a.createdAt,
      ),
    );

export const commentCount = (todo: Todo): number => todo.comments?.length ?? 0;

/** Comments oldest-first (chat order, newest at the bottom). */
export const sortComments = (comments: TodoComment[]): TodoComment[] =>
  [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

/**
 * Short, human relative time: "just now", "5m", "3h", "yesterday", a weekday,
 * then a calendar date. `now` is injectable so it can be unit-tested.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) {
    return '';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) {
    return then.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
