import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ColumnDto } from '../types';
import { Card } from './Card';

export function Column({ column }: { column: ColumnDto }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const cardIds = column.cards.map((c) => c.id);

  return (
    <section ref={setNodeRef} className="column" data-over={isOver || undefined}>
      <header className="column-header">
        <h2 className="column-name">{column.name}</h2>
        <span className="column-count" aria-label={`${column.cards.length} cards`}>
          {column.cards.length}
        </span>
      </header>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="column-cards">
          {column.cards.length === 0 ? (
            <p className="column-empty">Solte um card aqui</p>
          ) : (
            column.cards.map((card) => <Card key={card.id} card={card} />)
          )}
        </div>
      </SortableContext>
    </section>
  );
}
