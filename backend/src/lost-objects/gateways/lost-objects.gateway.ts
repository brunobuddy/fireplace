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
import { LostObject } from '../entities/lost-object.entity';
import {
  familyLostObjectsRoom,
  LOST_OBJECT_EVENTS,
  LostObjectRemovedPayload,
} from './lost-object-events';

/**
 * Pure websocket transport for lost objects. One room per family; the service
 * calls the `emit*` helpers after persisting a change. Like the other
 * gateways it authenticates the connection — an unverified socket is dropped
 * so the realtime channel isn't an open backdoor past the HTTP guard.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class LostObjectsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(LostObjectsGateway.name);

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

  @SubscribeMessage(LOST_OBJECT_EVENTS.JOIN)
  handleJoin(
    @MessageBody() familyId: string,
    @ConnectedSocket() client: Socket,
  ): { joined: string } {
    client.join(familyLostObjectsRoom(familyId));
    return { joined: familyId };
  }

  emitAdded(object: LostObject): void {
    this.toFamily(object.familyId).emit(LOST_OBJECT_EVENTS.ADDED, object);
  }

  emitUpdated(object: LostObject): void {
    this.toFamily(object.familyId).emit(LOST_OBJECT_EVENTS.UPDATED, object);
  }

  emitRemoved(payload: LostObjectRemovedPayload): void {
    this.toFamily(payload.familyId).emit(LOST_OBJECT_EVENTS.REMOVED, payload);
  }

  private toFamily(familyId: string) {
    return this.server.to(familyLostObjectsRoom(familyId));
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
