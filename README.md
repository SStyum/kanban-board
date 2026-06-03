# Kanban Board

Board colaborativo em tempo real com WebSocket.

## Stack

- API: NestJS + Prisma + Socket.io
- Web: React + dnd-kit + Zustand

## Como rodar

1. `cp .env.example .env`
2. `docker compose up -d`
3. `cd apps/api && pnpm prisma:migrate && pnpm prisma:seed && pnpm dev`
4. `cd apps/web && pnpm dev`

## Estrutura de dados

```
Board ──< Column ──< Card
  id        id        id
  name      name      title
  createdAt position  description
            boardId   position
                      columnId
                      createdAt
                      updatedAt
```

Schema completo em [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).
Cascata de delete: remover um `Board` apaga colunas e cards; remover uma `Column` apaga seus cards.

## Endpoints (REST)

| Método | Rota          | Body                                             | Descrição                                         |
| ------ | ------------- | ------------------------------------------------ | ------------------------------------------------- |
| GET    | `/health`     | —                                                | Liveness probe                                    |
| GET    | `/boards`     | —                                                | Lista boards com contagem de colunas              |
| GET    | `/boards/:id` | —                                                | Board com colunas e cards ordenados por position  |
| POST   | `/boards`     | `{ name }`                                       | Cria board com 3 colunas padrão (Todo/Doing/Done) |
| DELETE | `/boards/:id` | —                                                | Remove board e tudo abaixo (cascade)              |
| POST   | `/cards`      | `{ columnId, title, description? }`              | Cria card no final da coluna                      |
| PATCH  | `/cards/:id`  | `{ title?, description?, columnId?, position? }` | Atualiza ou move card                             |
| DELETE | `/cards/:id`  | —                                                | Remove card                                       |

## WebSocket Events

Socket.io rodando no mesmo host da API (`ws://localhost:3000`). Cada board tem uma room
`board:<boardId>` — só recebe eventos quem está nela.

**Como entrar numa room** — duas formas equivalentes:

```ts
// 1) handshake query (auto-join ao conectar)
const socket = io('ws://localhost:3000', { query: { boardId } });

// 2) evento explícito (útil pra trocar de board sem reconectar)
socket.emit('join-board', { boardId });
socket.emit('leave-board', { boardId });
```

**Eventos do servidor → cliente** (disparados pelas mutações REST em `/cards`):

| Evento         | Disparado por                 | Payload                                       |
| -------------- | ----------------------------- | --------------------------------------------- |
| `card:created` | `POST /cards`                 | `{ boardId, columnId, card }`                 |
| `card:moved`   | `PATCH /cards/:id` (move/pos) | `{ boardId, fromColumnId, toColumnId, card }` |
| `card:deleted` | `DELETE /cards/:id`           | `{ boardId, columnId, cardId }`               |

> `card:moved` dispara apenas quando `columnId` ou `position` mudam — edições de
> título/descrição não emitem evento.

## Frontend

Página única carrega o primeiro board via `GET /boards` + `GET /boards/:id`. Se existir
mais de um board, aparece um seletor no topo. Layout horizontal de colunas com cards
ordenados por `position`. Estados de loading / vazio (sugere rodar o seed) / erro.

```
┌─ Sprint 1 ─────────────────────────────────────────────────────┐
│                                                                │
│  ┌─ TODO (2) ─┐  ┌─ DOING (1) ─┐  ┌─ DONE (1) ─┐                │
│  │ ┌────────┐ │  │ ┌─────────┐ │  │ ┌────────┐ │                │
│  │ │ Card A │ │  │ │ Card C  │ │  │ │ Card D │ │                │
│  │ └────────┘ │  │ └─────────┘ │  │ └────────┘ │                │
│  │ ┌────────┐ │  │             │  │            │                │
│  │ │ Card B │ │  │             │  │            │                │
│  │ └────────┘ │  │             │  │            │                │
│  └────────────┘  └─────────────┘  └────────────┘                │
└────────────────────────────────────────────────────────────────┘
```

Componentes em [apps/web/src/components/](apps/web/src/components/).

## Drag and drop

[dnd-kit](https://dndkit.com/) com `DndContext` + `SortableContext` por coluna. Cada coluna é um
droppable, cada card é sortable. Sensores: `PointerSensor` (com 5px de tolerância pra não capturar
cliques) e `KeyboardSensor` (acessibilidade — Tab + Espaço para pegar, setas pra mover).

**Optimistic update com rollback**:

```
1. usuário solta o card
2. estado local muda imediatamente (UI já reflete a nova posição)
3. PATCH /cards/:id { columnId, position } é enviado em background
4. se a API responder 4xx/5xx, o estado é revertido e um toast vermelho aparece no canto
```

Lógica de move em [apps/web/src/lib/board-mutations.ts](apps/web/src/lib/board-mutations.ts).
DragOverlay renderiza uma cópia inclinada do card sob o cursor.
