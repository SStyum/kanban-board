import type { ColumnDto } from '../types';
import { Card } from './Card';

export function Column({ column }: { column: ColumnDto }) {
  return (
    <section className="column">
      <header className="column-header">
        <h2 className="column-name">{column.name}</h2>
        <span className="column-count" aria-label={`${column.cards.length} cards`}>
          {column.cards.length}
        </span>
      </header>
      <div className="column-cards">
        {column.cards.length === 0 ? (
          <p className="column-empty">Nenhum card</p>
        ) : (
          column.cards.map((card) => <Card key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}
