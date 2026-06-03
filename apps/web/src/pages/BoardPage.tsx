import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Board } from '../components/Board';
import { CardPresentation } from '../components/Card';
import { fetchBoard, fetchBoards, updateCard } from '../lib/api';
import { findCardLocation, moveCard } from '../lib/board-mutations';
import type { BoardDetail, BoardSummary, CardDto } from '../types';

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; boards: BoardSummary[]; board: BoardDetail };

export function BoardPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardDto | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const cardsById = useMemo(() => {
    if (state.kind !== 'ready') return new Map<string, CardDto>();
    const map = new Map<string, CardDto>();
    for (const col of state.board.columns) for (const c of col.cards) map.set(c.id, c);
    return map;
  }, [state]);

  function onDragStart(event: DragStartEvent) {
    const card = cardsById.get(String(event.active.id));
    if (card) setActiveCard(card);
  }

  function resolveDropTarget(activeId: string, overId: string) {
    if (state.kind !== 'ready') return null;
    const board = state.board;

    if (overId.startsWith('column:')) {
      const columnId = overId.slice('column:'.length);
      const column = board.columns.find((c) => c.id === columnId);
      if (!column) return null;
      return { columnId, index: column.cards.length };
    }

    const overLocation = findCardLocation(board, overId);
    if (!overLocation) return null;
    const activeLocation = findCardLocation(board, activeId);
    if (!activeLocation) return null;

    let targetIndex = overLocation.index;
    if (activeLocation.column.id === overLocation.column.id && activeLocation.index < targetIndex) {
      targetIndex += 1;
    }
    return { columnId: overLocation.column.id, index: targetIndex };
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || state.kind !== 'ready') return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const target = resolveDropTarget(activeId, overId);
    if (!target) return;

    const result = moveCard(state.board, activeId, target.columnId, target.index);
    if (!result) return;

    const previousBoard = state.board;
    setState({ ...state, board: result.board });
    setMoveError(null);

    try {
      await updateCard(activeId, {
        columnId: result.toColumnId,
        position: result.newPosition,
      });
    } catch (err) {
      setState({ ...state, board: previousBoard });
      setMoveError(err instanceof Error ? err.message : String(err));
    }
  }

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
      {moveError && (
        <div className="toast toast-error" role="alert">
          Falha ao mover: {moveError}
          <button type="button" onClick={() => setMoveError(null)} aria-label="Fechar">
            ×
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <Board board={state.board} />
        <DragOverlay>{activeCard ? <CardPresentation card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}
