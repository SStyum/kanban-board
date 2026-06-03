import type { BoardDetail } from '../types';
import { Column } from './Column';

export function Board({ board }: { board: BoardDetail }) {
  return (
    <div className="board">
      <header className="board-header">
        <h1 className="board-title">{board.name}</h1>
      </header>
      <div className="board-columns">
        {board.columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </div>
  );
}
