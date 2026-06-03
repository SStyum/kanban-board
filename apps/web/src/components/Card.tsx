import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardDto } from '../types';

export function Card({ card }: { card: CardDto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} {...attributes} {...listeners} className="card">
      <h3 className="card-title">{card.title}</h3>
      {card.description && <p className="card-description">{card.description}</p>}
    </article>
  );
}

export function CardPresentation({ card }: { card: CardDto }) {
  return (
    <article className="card card-overlay">
      <h3 className="card-title">{card.title}</h3>
      {card.description && <p className="card-description">{card.description}</p>}
    </article>
  );
}
