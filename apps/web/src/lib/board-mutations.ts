import type { BoardDetail, CardDto } from '../types';

export type MoveResult = {
  board: BoardDetail;
  card: CardDto;
  fromColumnId: string;
  toColumnId: string;
  newPosition: number;
};

export function findCardLocation(board: BoardDetail, cardId: string) {
  for (const column of board.columns) {
    const index = column.cards.findIndex((c) => c.id === cardId);
    if (index !== -1) return { column, index, card: column.cards[index] };
  }
  return null;
}

export function moveCard(
  board: BoardDetail,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): MoveResult | null {
  const source = findCardLocation(board, cardId);
  if (!source) return null;

  const fromColumnId = source.column.id;
  const fromIndex = source.index;
  if (fromColumnId === toColumnId && fromIndex === toIndex) return null;

  const columns = board.columns.map((column) => ({ ...column, cards: [...column.cards] }));
  const sourceCol = columns.find((c) => c.id === fromColumnId)!;
  const [moved] = sourceCol.cards.splice(fromIndex, 1);

  const targetCol = columns.find((c) => c.id === toColumnId);
  if (!targetCol) return null;

  const clampedIndex = Math.max(0, Math.min(toIndex, targetCol.cards.length));
  const updatedCard: CardDto = { ...moved, columnId: toColumnId, position: clampedIndex };
  targetCol.cards.splice(clampedIndex, 0, updatedCard);

  return {
    board: { ...board, columns },
    card: updatedCard,
    fromColumnId,
    toColumnId,
    newPosition: clampedIndex,
  };
}
