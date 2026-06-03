import { Test } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { BoardGateway } from './board.gateway';

type MockSocket = {
  id: string;
  join: jest.Mock;
  leave: jest.Mock;
  disconnect: jest.Mock;
  handshake: {
    query: Record<string, string>;
    auth: Record<string, string>;
  };
};

function makeSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  return {
    id: 'sid',
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    handshake: { query: {}, auth: {} },
    ...overrides,
  };
}

describe('BoardGateway', () => {
  let gateway: BoardGateway;
  let authService: { verify: jest.Mock };
  let mockRoom: { emit: jest.Mock };
  let mockServer: { to: jest.Mock };

  beforeEach(async () => {
    authService = { verify: jest.fn().mockReturnValue({ sub: 'u1', email: 'a@b.c' }) };

    const moduleRef = await Test.createTestingModule({
      providers: [BoardGateway, { provide: AuthService, useValue: authService }],
    }).compile();

    gateway = moduleRef.get(BoardGateway);
    mockRoom = { emit: jest.fn() };
    mockServer = { to: jest.fn().mockReturnValue(mockRoom) };
    (gateway as unknown as { server: unknown }).server = mockServer;
  });

  describe('handleConnection', () => {
    it('joins the board room when handshake carries a valid token and boardId', () => {
      const client = makeSocket({
        handshake: { query: { boardId: 'b1' }, auth: { token: 'jwt' } },
      });
      gateway.handleConnection(client as unknown as Socket);
      expect(authService.verify).toHaveBeenCalledWith('jwt');
      expect(client.join).toHaveBeenCalledWith('board:b1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('accepts a token passed via query as a fallback', () => {
      const client = makeSocket({
        handshake: { query: { boardId: 'b1', token: 'jwt-fallback' }, auth: {} },
      });
      gateway.handleConnection(client as unknown as Socket);
      expect(authService.verify).toHaveBeenCalledWith('jwt-fallback');
      expect(client.join).toHaveBeenCalledWith('board:b1');
    });

    it('disconnects clients with no token', () => {
      const client = makeSocket();
      gateway.handleConnection(client as unknown as Socket);
      expect(authService.verify).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('disconnects clients with an invalid token', () => {
      authService.verify.mockImplementation(() => {
        throw new Error('jwt invalid');
      });
      const client = makeSocket({
        handshake: { query: { boardId: 'b1' }, auth: { token: 'bad' } },
      });
      gateway.handleConnection(client as unknown as Socket);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('authenticates but does not auto-join when boardId is missing', () => {
      const client = makeSocket({
        handshake: { query: {}, auth: { token: 'jwt' } },
      });
      gateway.handleConnection(client as unknown as Socket);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('join-board / leave-board', () => {
    it('adds the client to the requested room', () => {
      const client = makeSocket();
      const result = gateway.joinBoard(client as unknown as Socket, { boardId: 'b1' });
      expect(client.join).toHaveBeenCalledWith('board:b1');
      expect(result).toEqual({ ok: true, room: 'board:b1' });
    });

    it('rejects join with empty boardId', () => {
      const client = makeSocket();
      const result = gateway.joinBoard(client as unknown as Socket, { boardId: '' });
      expect(client.join).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
    });

    it('removes the client from the requested room', () => {
      const client = makeSocket();
      const result = gateway.leaveBoard(client as unknown as Socket, { boardId: 'b1' });
      expect(client.leave).toHaveBeenCalledWith('board:b1');
      expect(result.ok).toBe(true);
    });
  });

  describe('emit*', () => {
    it('broadcasts card:created to the board room', () => {
      gateway.emitCardCreated({ boardId: 'b1', columnId: 'c1', card: { id: 'k1' } });
      expect(mockServer.to).toHaveBeenCalledWith('board:b1');
      expect(mockRoom.emit).toHaveBeenCalledWith('card:created', {
        boardId: 'b1',
        columnId: 'c1',
        card: { id: 'k1' },
      });
    });

    it('broadcasts card:moved to the board room', () => {
      gateway.emitCardMoved({
        boardId: 'b1',
        fromColumnId: 'c1',
        toColumnId: 'c2',
        card: { id: 'k1' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('board:b1');
      expect(mockRoom.emit).toHaveBeenCalledWith(
        'card:moved',
        expect.objectContaining({
          fromColumnId: 'c1',
          toColumnId: 'c2',
        }),
      );
    });

    it('broadcasts card:deleted to the board room', () => {
      gateway.emitCardDeleted({ boardId: 'b1', columnId: 'c1', cardId: 'k1' });
      expect(mockServer.to).toHaveBeenCalledWith('board:b1');
      expect(mockRoom.emit).toHaveBeenCalledWith('card:deleted', {
        boardId: 'b1',
        columnId: 'c1',
        cardId: 'k1',
      });
    });
  });
});
