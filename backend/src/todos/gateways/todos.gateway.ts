import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Todo } from '../entities/todo.entity';
import {
  familyTodosRoom,
  TODO_EVENTS,
  TodoRemovedPayload,
} from './todo-events';

/**
 * Pure websocket transport: the service calls these after every mutation and
 * the broadcast lands in the family's room. One room per family keeps todos
 * scoped exactly like the data model (and like real auth will be later).
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class TodosGateway {
  @WebSocketServer()
  private server!: Server;

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
