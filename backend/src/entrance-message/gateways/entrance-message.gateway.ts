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
import {
  ENTRANCE_MESSAGE_EVENTS,
  EntranceMessageUpdatedPayload,
  familyEntranceMessageRoom,
} from './entrance-message-events';

/**
 * Pure websocket transport for the entrance message. One room per family; the
 * service calls {@link emitUpdated} after persisting a change. Like the other
 * gateways it authenticates the connection — an unverified socket is dropped
 * so the realtime channel isn't an open backdoor past the HTTP guard.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class EntranceMessageGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EntranceMessageGateway.name);

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

  @SubscribeMessage(ENTRANCE_MESSAGE_EVENTS.JOIN)
  handleJoin(
    @MessageBody() familyId: string,
    @ConnectedSocket() client: Socket,
  ): { joined: string } {
    client.join(familyEntranceMessageRoom(familyId));
    return { joined: familyId };
  }

  emitUpdated(payload: EntranceMessageUpdatedPayload): void {
    this.server
      .to(familyEntranceMessageRoom(payload.familyId))
      .emit(ENTRANCE_MESSAGE_EVENTS.UPDATED, payload);
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
