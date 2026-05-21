import { Todo } from '../entities/todo.entity';

/**
 * Websocket event contract for the to-do board — the frontend mirrors these
 * names. Comments fold into `TODO_UPDATED`: any comment add/remove re-emits
 * the full todo (with its thread), so clients keep a single idempotent
 * "upsert a todo by id" code path.
 */
export const TODO_EVENTS = {
  JOIN: 'todo:join',
  TODO_ADDED: 'todo:added',
  TODO_UPDATED: 'todo:updated',
  TODO_REMOVED: 'todo:removed',
} as const;

export const familyTodosRoom = (familyId: string): string =>
  `family-todos:${familyId}`;

export interface TodoRemovedPayload {
  id: string;
  familyId: string;
}

export type TodoPayload = Todo;
