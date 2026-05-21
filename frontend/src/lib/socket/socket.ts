import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../api/http';

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

let socket: Socket | null = null;

/** Lazily create one shared connection for the whole app. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}
