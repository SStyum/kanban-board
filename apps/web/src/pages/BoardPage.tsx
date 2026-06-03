import { useEffect, useState } from 'react';
import { Board } from '../components/Board';
import { fetchBoard, fetchBoards } from '../lib/api';
import type { BoardDetail, BoardSummary } from '../types';

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; boards: BoardSummary[]; board: BoardDetail };

export function BoardPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boards = await fetchBoards();
        if (cancelled) return;
        if (boards.length === 0) {
          setState({ kind: 'empty' });
          return;
        }
        const targetId = selectedId ?? boards[0].id;
        const board = await fetchBoard(targetId);
        if (cancelled) return;
        setState({ kind: 'ready', boards, board });
      } catch (err) {
        if (cancelled) return;
        setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (state.kind === 'loading') return <p className="status">Carregando…</p>;

  if (state.kind === 'empty') {
    return (
      <div className="status">
        <p>Nenhum board ainda.</p>
        <p>
          Rode <code>pnpm prisma:seed</code> em <code>apps/api</code> para popular dados de exemplo.
        </p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="status status-error">
        <p>Erro ao carregar board:</p>
        <pre>{state.message}</pre>
      </div>
    );
  }

  return (
    <>
      {state.boards.length > 1 && (
        <nav className="board-picker">
          <label htmlFor="board-select">Board: </label>
          <select
            id="board-select"
            value={state.board.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {state.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </nav>
      )}
      <Board board={state.board} />
    </>
  );
}
