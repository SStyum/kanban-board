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
import { ConnectionBadge } from '../components/ConnectionBadge';
import { fetchBoard, fetchBoards, updateCard } from '../lib/api';
import { findCardLocation, moveCard } from '../lib/board-mutations';
import { useBoardSocket } from '../lib/socket';
import { useBoardStore } from '../store/boardStore';
import type { BoardDetail, BoardSummary, CardDto } from '../types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; boards: BoardSummary[] };

export function BoardPage() {
  const board = useBoardStore((s) => s.board);
  const setBoard = useBoardStore((s) => s.setBoard);

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardDto | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const socketStatus = useBoardSocket(board?.id ?? null);

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
          setBoard(null);
          setLoadState({ kind: 'empty' });
          return;
        }
        const targetId = selectedId ?? boards[0].id;
        const detail = await fetchBoard(targetId);
        if (cancelled) return;
        setBoard(detail);
        setLoadState({ kind: 'ready', boards });
      } catch (err) {
        if (cancelled) return;
        setBoard(null);
        setLoadState({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, setBoard]);

  const cardsById = useMemo(() => {
    const map = new Map<string, CardDto>();
    if (!board) return map;
    for (const col of board.columns) for (const c of col.cards) map.set(c.id, c);
    return map;
  }, [board]);

  function onDragStart(event: DragStartEvent) {
    const card = cardsById.get(String(event.active.id));
    if (card) setActiveCard(card);
  }

  function resolveDropTarget(activeId: string, overId: string, currentBoard: BoardDetail) {
    if (overId.startsWith('column:')) {
      const columnId = overId.slice('column:'.length);
      const column = currentBoard.columns.find((c) => c.id === columnId);
      if (!column) return null;
      return { columnId, index: column.cards.length };
    }

    const overLocation = findCardLocation(currentBoard, overId);
    if (!overLocation) return null;
    const activeLocation = findCardLocation(currentBoard, activeId);
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
    if (!over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const target = resolveDropTarget(activeId, overId, board);
    if (!target) return;

    const result = moveCard(board, activeId, target.columnId, target.index);
    if (!result) return;

    const previousBoard = board;
    setBoard(result.board);
    setMoveError(null);

    try {
      await updateCard(activeId, {
        columnId: result.toColumnId,
        position: result.newPosition,
      });
    } catch (err) {
      setBoard(previousBoard);
      setMoveError(err instanceof Error ? err.message : String(err));
    }
  }

  if (loadState.kind === 'loading') return <p className="status">Carregando…</p>;

  if (loadState.kind === 'empty') {
    return (
      <div className="status">
        <p>Nenhum board ainda.</p>
        <p>
          Rode <code>pnpm prisma:seed</code> em <code>apps/api</code> para popular dados de exemplo.
        </p>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className="status status-error">
        <p>Erro ao carregar board:</p>
        <pre>{loadState.message}</pre>
      </div>
    );
  }

  if (!board) return <p className="status">Carregando board…</p>;

  return (
    <>
      <div className="topbar">
        {loadState.boards.length > 1 ? (
          <nav className="board-picker">
            <label htmlFor="board-select">Board: </label>
            <select
              id="board-select"
              value={board.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {loadState.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </nav>
        ) : (
          <div />
        )}
        <ConnectionBadge status={socketStatus} />
      </div>
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
        <Board board={board} />
        <DragOverlay>{activeCard ? <CardPresentation card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}
