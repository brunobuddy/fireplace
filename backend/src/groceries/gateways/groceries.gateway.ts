import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GroceryItem } from '../entities/grocery-item.entity';
import {
  CartClearedPayload,
  GROCERY_EVENTS,
  ItemRemovedPayload,
  listRoom,
} from './grocery-events';

/**
 * Pushes list changes to every device viewing the same list in real time.
 * Each list is a Socket.IO room; the service calls the `emit*` helpers after
 * it has persisted a change. The gateway only does transport — no business
 * logic (SRP).
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class GroceriesGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage(GROCERY_EVENTS.JOIN)
  handleJoin(
    @MessageBody() listId: string,
    @ConnectedSocket() client: Socket,
  ): { joined: string } {
    client.join(listRoom(listId));
    return { joined: listId };
  }

  emitItemAdded(item: GroceryItem): void {
    this.toList(item.listId).emit(GROCERY_EVENTS.ITEM_ADDED, item);
  }

  emitItemUpdated(item: GroceryItem): void {
    this.toList(item.listId).emit(GROCERY_EVENTS.ITEM_UPDATED, item);
  }

  emitItemRemoved(payload: ItemRemovedPayload): void {
    this.toList(payload.listId).emit(GROCERY_EVENTS.ITEM_REMOVED, payload);
  }

  emitCartCleared(payload: CartClearedPayload): void {
    this.toList(payload.listId).emit(GROCERY_EVENTS.CART_CLEARED, payload);
  }

  private toList(listId: string) {
    return this.server.to(listRoom(listId));
  }
}
