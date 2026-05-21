import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';
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
 * logic (SRP) — but it does authenticate the connection: an unverified socket
 * is dropped so the realtime channel isn't an open backdoor past the HTTP guard.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class GroceriesGateway implements OnGatewayConnection {
  private readonly logger = new Logger(GroceriesGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly auth: AuthService) {}

  handleConnection(client: Socket): void {
    const token = extractToken(client);
    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: no token`);
      client.disconnect();
      return;
    }
    try {
      this.auth.verify(token);
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

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

/** Pull the JWT from the Socket.IO handshake (auth payload or Bearer header). */
function extractToken(client: Socket): string | null {
  const fromAuth = client.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth) {
    return fromAuth;
  }
  const header = client.handshake.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  return null;
}
