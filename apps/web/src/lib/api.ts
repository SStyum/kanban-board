import { readToken, useAuthStore } from '../store/authStore';
import type { BoardDetail, BoardSummary, CardDto } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const token = readToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('unauthorized');
  }
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

type AuthUser = { id: string; email: string };
type AuthResponse = { accessToken: string; user: AuthUser };

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
