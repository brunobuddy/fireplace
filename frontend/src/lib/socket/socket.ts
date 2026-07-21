import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from '../api/auth-token';

/**
 * The websocket event contract — must mirror the backend's `GROCERY_EVENTS`.
 */
export const GROCERY_EVENTS = {
  JOIN: 'grocery:join',
  ITEM_ADDED: 'grocery:item_added',
  ITEM_UPDATED: 'grocery:item_updated',
  ITEM_REMOVED: 'grocery:item_removed',
  CART_CLEARED: 'grocery:cart_cleared',
} as const;

/** To-do board events — must mirror the backend's `TODO_EVENTS`. */
export const TODO_EVENTS = {
  JOIN: 'todo:join',
  TODO_ADDED: 'todo:added',
  TODO_UPDATED: 'todo:updated',
  TODO_REMOVED: 'todo:removed',
} as const;

/** Projects board events — must mirror the backend's `PROJECT_EVENTS`. */
export const PROJECT_EVENTS = {
  JOIN: 'project:join',
  PROJECT_ADDED: 'project:added',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_REMOVED: 'project:removed',
} as const;

/** Spark events — must mirror the backend's `SPARK_EVENTS`. Neither broadcast
 *  carries answer text, so secrecy holds over the wire. */
export const SPARK_EVENTS = {
  JOIN: 'spark:join',
  UPDATED: 'spark:updated',
  QUESTION: 'spark:question',
} as const;

let socket: Socket | null = null;

/**
 * Lazily create one shared connection for the whole app. The current bearer
 * token rides along in the handshake so the gateway can authenticate it —
 * this is only ever called from authenticated views, so a token is present.
 */
export function getSocket(): Socket {
  if (!socket) {
    // No URL → same origin. NestJS serves the websocket in prod; Vite proxies
    // `/socket.io` (ws) in dev. The bearer token rides in the handshake.
    socket = io({
      transports: ['websocket'],
      autoConnect: true,
      auth: { token: getAuthToken() ?? '' },
    });
  }
  return socket;
}

/** Tear the connection down on logout so the next login reconnects fresh. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
