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
