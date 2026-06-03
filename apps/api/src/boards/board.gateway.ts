import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type BoardRoomPayload = { boardId: string };

export type CardCreatedPayload = {
  boardId: string;
  columnId: string;
  card: unknown;
};

export type CardMovedPayload = {
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  card: unknown;
};

export type CardDeletedPayload = {
  boardId: string;
  columnId: string;
  cardId: string;
};

function roomFor(boardId: string) {
  return `board:${boardId}`;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const boardId = client.handshake.query.boardId;
    if (typeof boardId === 'string' && boardId.length > 0) {
      client.join(roomFor(boardId));
      this.logger.log(`client ${client.id} joined board ${boardId} via handshake`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client ${client.id} disconnected`);
  }

  @SubscribeMessage('join-board')
  joinBoard(@ConnectedSocket() client: Socket, @MessageBody() body: BoardRoomPayload) {
    if (!body?.boardId) return { ok: false, error: 'boardId required' };
    client.join(roomFor(body.boardId));
    return { ok: true, room: roomFor(body.boardId) };
  }

  @SubscribeMessage('leave-board')
  leaveBoard(@ConnectedSocket() client: Socket, @MessageBody() body: BoardRoomPayload) {
    if (!body?.boardId) return { ok: false, error: 'boardId required' };
    client.leave(roomFor(body.boardId));
    return { ok: true };
  }

  emitCardCreated(payload: CardCreatedPayload) {
    this.server.to(roomFor(payload.boardId)).emit('card:created', payload);
  }

  emitCardMoved(payload: CardMovedPayload) {
    this.server.to(roomFor(payload.boardId)).emit('card:moved', payload);
  }

  emitCardDeleted(payload: CardDeletedPayload) {
    this.server.to(roomFor(payload.boardId)).emit('card:deleted', payload);
  }
}
