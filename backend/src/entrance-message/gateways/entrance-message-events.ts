import { EntranceMessageView } from '../services/entrance-message.view';

/**
 * Websocket event contract for the entrance message — the frontend mirrors
 * these names. There is a single event: the message as it now stands, or
 * `null` once cleared, so clients just replace what they hold.
 */
export const ENTRANCE_MESSAGE_EVENTS = {
  JOIN: 'entrance-message:join',
  UPDATED: 'entrance-message:updated',
} as const;

export const familyEntranceMessageRoom = (familyId: string): string =>
  `family-entrance-message:${familyId}`;

export interface EntranceMessageUpdatedPayload {
  familyId: string;
  message: EntranceMessageView | null;
}
