import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useBoardStore } from '../store/boardStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useBoardSocket(boardId: string | null): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const applyCardCreated = useBoardStore((s) => s.applyCardCreated);
  const applyCardMoved = useBoardStore((s) => s.applyCardMoved);
  const applyCardDeleted = useBoardStore((s) => s.applyCardDeleted);

  useEffect(() => {
    if (!boardId) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const socket = io(API_URL, {
      transports: ['websocket'],
      query: { boardId },
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    socket.on('card:created', applyCardCreated);
    socket.on('card:moved', applyCardMoved);
    socket.on('card:deleted', applyCardDeleted);

    return () => {
      socket.disconnect();
    };
  }, [boardId, applyCardCreated, applyCardMoved, applyCardDeleted]);

  return status;
}
