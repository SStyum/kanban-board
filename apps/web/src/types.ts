export type CardDto = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  createdAt: string;
  updatedAt: string;
};

export type ColumnDto = {
  id: string;
  name: string;
  position: number;
  boardId: string;
  cards: CardDto[];
};

export type BoardSummary = {
  id: string;
  name: string;
  createdAt: string;
  _count: { columns: number };
};

export type BoardDetail = {
  id: string;
  name: string;
  createdAt: string;
  columns: ColumnDto[];
};
