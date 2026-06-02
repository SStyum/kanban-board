# Kanban Board

Board colaborativo em tempo real com WebSocket.

## Stack

- API: NestJS + Prisma + Socket.io
- Web: React + dnd-kit + Zustand

## Como rodar

1. `cp .env.example .env`
2. `docker compose up -d`
3. `cd apps/api && pnpm dev`
4. `cd apps/web && pnpm dev`
