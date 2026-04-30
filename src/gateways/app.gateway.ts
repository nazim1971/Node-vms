import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'https://vms.node-devs.com',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    // Gateway initialized — server is ready
  }

  /**
   * Clients emit `joinRoom` with their tenantId to subscribe to live location
   * updates for their tenant. The server adds them to `tenant:{tenantId}` room.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() tenantId: string,
  ): void {
    if (typeof tenantId === 'string' && tenantId.trim()) {
      void client.join(`tenant:${tenantId.trim()}`);
    }
  }

  /**
   * Emit a GPS location update to all clients subscribed to a tenant's room.
   * Clients join via:  socket.emit('joinRoom', tenantId)
   */
  emitLocation(tenantId: string, data: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('locationUpdate', data);
  }
}
