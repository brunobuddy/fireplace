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
import { Project } from '../entities/project.entity';
import {
  familyProjectsRoom,
  PROJECT_EVENTS,
  ProjectRemovedPayload,
} from './project-events';

/**
 * Pure websocket transport for the projects board. One room per family; the
 * services call the `emit*` helpers after persisting a change. Like the other
 * gateways it authenticates the connection — an unverified socket is dropped
 * so the realtime channel isn't an open backdoor past the HTTP guard.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? '*').split(',') },
})
export class ProjectsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ProjectsGateway.name);

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

  @SubscribeMessage(PROJECT_EVENTS.JOIN)
  handleJoin(
    @MessageBody() familyId: string,
    @ConnectedSocket() client: Socket,
  ): { joined: string } {
    client.join(familyProjectsRoom(familyId));
    return { joined: familyId };
  }

  emitProjectAdded(project: Project): void {
    this.toFamily(project.familyId).emit(PROJECT_EVENTS.PROJECT_ADDED, project);
  }

  emitProjectUpdated(project: Project): void {
    this.toFamily(project.familyId).emit(
      PROJECT_EVENTS.PROJECT_UPDATED,
      project,
    );
  }

  emitProjectRemoved(payload: ProjectRemovedPayload): void {
    this.toFamily(payload.familyId).emit(
      PROJECT_EVENTS.PROJECT_REMOVED,
      payload,
    );
  }

  private toFamily(familyId: string) {
    return this.server.to(familyProjectsRoom(familyId));
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
