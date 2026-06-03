import { create } from 'zustand';
import type { BoardDetail, CardDto, ColumnDto } from '../types';

type CardCreatedPayload = { boardId: string; columnId: string; card: CardDto };
type CardMovedPayload = {
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  card: CardDto;
};
type CardDeletedPayload = { boardId: string; columnId: string; cardId: string };

type BoardStore = {
  board: BoardDetail | null;
  setBoard: (board: BoardDetail | null) => void;
  applyCardCreated: (payload: CardCreatedPayload) => void;
  applyCardMoved: (payload: CardMovedPayload) => void;
  applyCardDeleted: (payload: CardDeletedPayload) => void;
};

function cloneColumns(columns: ColumnDto[]): ColumnDto[] {
  return columns.map((c) => ({ ...c, cards: [...c.cards] }));
}

function removeCardFromColumns(columns: ColumnDto[], cardId: string) {
  for (const col of columns) {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      col.cards.splice(idx, 1);
      return true;
    }
  }
  return false;
}

function insertCard(columns: ColumnDto[], card: CardDto) {
  const target = columns.find((c) => c.id === card.columnId);
  if (!target) return;
  const insertAt = Math.max(0, Math.min(card.position, target.cards.length));
  target.cards.splice(insertAt, 0, card);
}

export const useBoardStore = create<BoardStore>((set) => ({
  board: null,

  setBoard: (board) => set({ board }),

  applyCardCreated: ({ boardId, card }) =>
    set((state) => {
      if (!state.board || state.board.id !== boardId) return state;
      const columns = cloneColumns(state.board.columns);
      const exists = columns.some((col) => col.cards.some((c) => c.id === card.id));
      if (exists) return state;
      insertCard(columns, card);
      return { board: { ...state.board, columns } };
    }),

  applyCardMoved: ({ boardId, card }) =>
    set((state) => {
      if (!state.board || state.board.id !== boardId) return state;
      const columns = cloneColumns(state.board.columns);
      removeCardFromColumns(columns, card.id);
      insertCard(columns, card);
      return { board: { ...state.board, columns } };
    }),

  applyCardDeleted: ({ boardId, cardId }) =>
    set((state) => {
      if (!state.board || state.board.id !== boardId) return state;
      const columns = cloneColumns(state.board.columns);
      const removed = removeCardFromColumns(columns, cardId);
      if (!removed) return state;
      return { board: { ...state.board, columns } };
    }),
}));
