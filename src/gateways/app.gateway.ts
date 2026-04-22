import { Injectable } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/',
})
export class AppGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    // Gateway initialized — server is ready
  }

  /**
   * Emit a GPS location update to all clients subscribed to a tenant's room.
   * Clients join via:  socket.emit('joinRoom', tenantId)
   */
  emitLocation(tenantId: string, data: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('locationUpdate', data);
  }
}
