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

// Moved to the shared lib (the projects board tells time the same way);
// re-exported so existing imports keep working.
export { relativeTime } from '@/lib/relative-time';
