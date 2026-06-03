import type { BoardDetail, BoardSummary, CardDto } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body || path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchBoards() {
  return request<BoardSummary[]>('/boards');
}

export function fetchBoard(id: string) {
  return request<BoardDetail>(`/boards/${id}`);
}

export type UpdateCardInput = {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
};

export function updateCard(id: string, body: UpdateCardInput) {
  return request<CardDto>(`/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
