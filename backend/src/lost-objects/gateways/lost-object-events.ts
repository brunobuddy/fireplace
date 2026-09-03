import { LostObject } from '../entities/lost-object.entity';

/**
 * Websocket event contract for lost objects — the frontend mirrors these
 * names. "Found" is just an update: the full object is re-emitted, so clients
 * keep a single idempotent "upsert by id" code path.
 */
export const LOST_OBJECT_EVENTS = {
  JOIN: 'lost-object:join',
  ADDED: 'lost-object:added',
  UPDATED: 'lost-object:updated',
  REMOVED: 'lost-object:removed',
} as const;

export const familyLostObjectsRoom = (familyId: string): string =>
  `family-lost-objects:${familyId}`;

export interface LostObjectRemovedPayload {
  id: string;
  familyId: string;
}

export type LostObjectPayload = LostObject;
