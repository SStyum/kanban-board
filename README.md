# Kanban Board

[![Tests](https://img.shields.io/badge/tests-jest-blue)](apps/api/src/boards/board.gateway.spec.ts)
[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20React-success)](#stack)

Board colaborativo em tempo real com WebSocket. Drag-and-drop, sync entre abas,
autenticação JWT. Cada aba vê em tempo real o que as outras estão fazendo.

> **Demo**: _adicione o link aqui depois de fazer o deploy_

## Stack

- **API**: NestJS · Prisma · Socket.io · PostgreSQL · JWT
- **Web**: React · Vite · dnd-kit · Zustand · socket.io-client

## Como rodar

```bash
cp .env.example .env
docker compose up -d
cd apps/api
pnpm install
pnpm prisma:migrate
pnpm prisma:seed     # cria usuário demo@kanban.local / kanban123 e um board
pnpm dev             # API em http://localhost:3000

# em outro terminal
cd apps/web && pnpm dev   # Web em http://localhost:5173
```

A seed cria um usuário demo (`demo@kanban.local` / `kanban123`) e um board "Sprint 1".
Login na tela inicial usa essas credenciais por padrão.

## Estrutura de dados

```
User                Board ──< Column ──< Card
  id                  id        id        id
  email (unique)      name      name      title
  password (hash)     createdAt position  description
  createdAt                     boardId   position
                                          columnId
                                          createdAt
                                          updatedAt
```

Schema completo em [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).
Cascata de delete: remover um `Board` apaga colunas e cards; remover uma `Column` apaga seus cards.

## Autenticação

JWT simples — access token assinado com `JWT_SECRET`, expira em `JWT_EXPIRES_IN` (default `7d`).
Sem refresh token, sem cookies — token vai no header `Authorization: Bearer <token>` nas requisições
REST e no campo `auth.token` no handshake do Socket.io.

```ts
// Frontend (lib/api.ts) injeta o header automaticamente
fetch('/boards', { headers: { authorization: `Bearer ${token}` } });

// Frontend (lib/socket.ts) injeta no handshake
io(API_URL, { auth: { token }, query: { boardId } });
```

Senha hashada com bcrypt (10 rounds). 401 no REST faz o frontend deslogar e voltar pra Login.
401 / disconnect server-side no WS também desloga.

## Endpoints (REST)

| Método | Rota             | Auth | Body                                             | Descrição                                         |
| ------ | ---------------- | ---- | ------------------------------------------------ | ------------------------------------------------- |
| GET    | `/health`        | —    | —                                                | Liveness probe                                    |
| POST   | `/auth/register` | —    | `{ email, password }`                            | Cria usuário, retorna `{ user, accessToken }`     |
| POST   | `/auth/login`    | —    | `{ email, password }`                            | Retorna `{ user, accessToken }`                   |
| GET    | `/boards`        | JWT  | —                                                | Lista boards com contagem de colunas              |
| GET    | `/boards/:id`    | JWT  | —                                                | Board com colunas e cards ordenados por position  |
| POST   | `/boards`        | JWT  | `{ name }`                                       | Cria board com 3 colunas padrão (Todo/Doing/Done) |
| DELETE | `/boards/:id`    | JWT  | —                                                | Remove board e tudo abaixo (cascade)              |
| POST   | `/cards`         | JWT  | `{ columnId, title, description? }`              | Cria card no final da coluna                      |
| PATCH  | `/cards/:id`     | JWT  | `{ title?, description?, columnId?, position? }` | Atualiza ou move card                             |
| DELETE | `/cards/:id`     | JWT  | —                                                | Remove card                                       |

## WebSocket Events

Socket.io rodando no mesmo host da API (`ws://localhost:3000`). Cada board tem uma room
`board:<boardId>` — só recebe eventos quem está nela. **Conexões sem token JWT válido
são derrubadas em `handleConnection`** — nada vaza pra cliente não autenticado.

**Como entrar numa room** — token obrigatório:

```ts
// 1) handshake auth + query (auto-join ao conectar)
const socket = io('ws://localhost:3000', {
  auth: { token: accessToken },
  query: { boardId },
});

// 2) eventos explícitos (útil pra trocar de board sem reconectar)
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

Componentes em [apps/web/src/components/](apps/web/src/components/). Sem token, App renderiza
[LoginPage](apps/web/src/pages/LoginPage.tsx) ao invés do board.

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

## Sincronização em tempo real

Cada aba abre um socket no `VITE_API_URL` com `?boardId=` no handshake — o servidor já
coloca o cliente na room `board:<id>` automaticamente (sem precisar emitir `join-board`).
O estado do board mora numa store [Zustand](apps/web/src/store/boardStore.ts) e os eventos
caem direto nos handlers da store via `useBoardSocket` em [lib/socket.ts](apps/web/src/lib/socket.ts).

**Fluxo de uma mutação colaborativa**:

```
       ┌────────┐                              ┌────────┐
       │ Aba A  │                              │ Aba B  │
       └───┬────┘                              └────┬───┘
           │  drag&drop → optimistic update          │
           │  PATCH /cards/:id ─────────► API        │
           │                            │            │
           │                            ▼            │
           │                       broadcast         │
           │  ◄──── card:moved ─────────┼───► card:moved ──►│
           │  (idempotent reaplica)     │            store atualiza
           │                                         UI espelha A
```

As ações da store (`applyCardCreated/Moved/Deleted`) são **idempotentes**: receber
um evento que reflete um estado já presente é no-op. Isso resolve o eco do próprio
cliente (a aba que originou a mutação também recebe o broadcast).

**Indicador de conexão** — badge no topo direito:

| Status                | Quando                                                       |
| --------------------- | ------------------------------------------------------------ |
| `Conectando…` amarelo | montou o hook, ainda não chegou `connect`                    |
| `Ao vivo` verde       | `connect` recebido; mutações de outras abas aparecem na hora |
| `Offline` vermelho    | `disconnect` ou `connect_error` (rede caiu / API derrubada)  |

**Como testar com 2 abas**: rode API + web, abra `http://localhost:5173` em duas abas,
arraste um card numa — a outra reflete na hora.

## Testes

```bash
cd apps/api && pnpm test
```

Suite de unit tests em [board.gateway.spec.ts](apps/api/src/boards/board.gateway.spec.ts) cobre:

- `handleConnection` autoriza com JWT válido, rejeita sem token, rejeita token inválido
- `join-board` / `leave-board` adicionam / removem da room certa
- `emitCardCreated` / `emitCardMoved` / `emitCardDeleted` despacham pra `board:<id>`

11 testes, ~1s. Roda no `@nestjs/testing` com `AuthService` mockado.

## Deploy

Tudo configurado pra rodar no [Railway](https://railway.app) (API + Postgres) com Vercel
ou Railway hospedando o `apps/web` estático.

### API + Postgres (Railway)

1. `railway login`
2. `railway init` no root do repo
3. Adicione o plugin Postgres: `railway add` → escolha "PostgreSQL"
4. Configure variáveis do serviço API:
   - `DATABASE_URL` (vem do plugin Postgres — Railway injeta automático se vincular)
   - `JWT_SECRET` — gere com `openssl rand -hex 32`
   - `JWT_EXPIRES_IN=7d`
   - `API_PORT` — Railway expõe via `$PORT`, configure o serviço pra usar
   - `NODE_ENV=production`
5. Comandos do serviço:
   - Build: `cd apps/api && pnpm install && pnpm prisma generate && pnpm build`
   - Start: `cd apps/api && pnpm exec prisma migrate deploy && node dist/main.js`
6. `railway up`

### Web (Vercel ou Railway)

1. Build: `cd apps/web && pnpm install && pnpm build`
2. Output: `apps/web/dist`
3. Variável: `VITE_API_URL=https://<sua-api>.railway.app`
4. Rewrite/proxy SPA: serve `index.html` pra qualquer rota não-asset

### Checklist pré-deploy

- [ ] `JWT_SECRET` aleatório e longo (NUNCA o default)
- [ ] `DATABASE_URL` apontando pra Postgres gerenciado
- [ ] CORS — `app.enableCors({ origin: <web-url> })` em [main.ts](apps/api/src/main.ts) se quiser restringir
- [ ] `VITE_API_URL` no build do web aponta pra API de produção
- [ ] Demo user opcional — pode remover ou trocar a senha do seed antes de subir
