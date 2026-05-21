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
import { Todo } from '../entities/todo.entity';
import {
  familyTodosRoom,
  TODO_EVENTS,
  TodoRemovedPayload,
} from './todo-events';

/**
 * Pure websocket transport for the to-do board. One room per family; the
 * service calls the `emit*` helpers after persisting a change. Like the
 * groceries gateway it authenticates the connection — an unverified socket is
 * dropped so the realtime channel isn't an open backdoor past the HTTP guard.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class TodosGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TodosGateway.name);

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

  @SubscribeMessage(TODO_EVENTS.JOIN)
  handleJoin(
    @MessageBody() familyId: string,
    @ConnectedSocket() client: Socket,
  ): { joined: string } {
    client.join(familyTodosRoom(familyId));
    return { joined: familyId };
  }

  emitTodoAdded(todo: Todo): void {
    this.toFamily(todo.familyId).emit(TODO_EVENTS.TODO_ADDED, todo);
  }

  emitTodoUpdated(todo: Todo): void {
    this.toFamily(todo.familyId).emit(TODO_EVENTS.TODO_UPDATED, todo);
  }

  emitTodoRemoved(payload: TodoRemovedPayload): void {
    this.toFamily(payload.familyId).emit(TODO_EVENTS.TODO_REMOVED, payload);
  }

  private toFamily(familyId: string) {
    return this.server.to(familyTodosRoom(familyId));
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
