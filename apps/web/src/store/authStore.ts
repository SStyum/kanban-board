import { create } from 'zustand';

const TOKEN_KEY = 'kanban.token';

type AuthUser = { id: string; email: string };

type AuthStore = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

function loadToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: loadToken(),
  user: null,
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));

export function readToken(): string | null {
  return useAuthStore.getState().token;
}
