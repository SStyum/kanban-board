import type { CardDto } from '../types';

export function Card({ card }: { card: CardDto }) {
  return (
    <article className="card">
      <h3 className="card-title">{card.title}</h3>
      {card.description && <p className="card-description">{card.description}</p>}
    </article>
  );
}
