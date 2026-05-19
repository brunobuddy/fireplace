import { GroceryItem } from '../entities/grocery-item.entity';

/**
 * The websocket contract, shared by the gateway and (mirrored on) the client.
 * Keeping the event names in one place avoids stringly-typed drift between
 * server and SPA.
 */
export const GROCERY_EVENTS = {
  /** Client → server: start receiving updates for a list. */
  JOIN: 'grocery:join',
  /** Server → clients in the room. */
  ITEM_ADDED: 'grocery:item_added',
  ITEM_UPDATED: 'grocery:item_updated',
  ITEM_REMOVED: 'grocery:item_removed',
  CART_CLEARED: 'grocery:cart_cleared',
} as const;

export const listRoom = (listId: string): string => `list:${listId}`;

export interface ItemRemovedPayload {
  id: string;
  listId: string;
}

export interface CartClearedPayload {
  listId: string;
  removedIds: string[];
}

export type ItemPayload = GroceryItem;
