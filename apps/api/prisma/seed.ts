import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@kanban.local';
const DEMO_PASSWORD = 'kanban123';

async function main() {
  await prisma.card.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { password: passwordHash },
    create: { email: DEMO_EMAIL, password: passwordHash },
  });

  const board = await prisma.board.create({
    data: {
      name: 'Sprint 1',
      columns: {
        create: [
          {
            name: 'Todo',
            position: 0,
            cards: {
              create: [
                {
                  title: 'Set up CI pipeline',
                  description: 'Lint, typecheck and tests on every PR',
                  position: 0,
                },
                {
                  title: 'Write architecture doc',
                  position: 1,
                },
              ],
            },
          },
          {
            name: 'Doing',
            position: 1,
            cards: {
              create: [
                {
                  title: 'Implement boards CRUD',
                  description: 'REST endpoints + Prisma models',
                  position: 0,
                },
              ],
            },
          },
          {
            name: 'Done',
            position: 2,
            cards: {
              create: [
                {
                  title: 'Project scaffold',
                  description: 'Monorepo, Postgres, ESLint, Prettier',
                  position: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      columns: { include: { cards: true } },
    },
  });

  const cardCount = board.columns.reduce((acc, col) => acc + col.cards.length, 0);
  console.log(
    `[seed] user "${user.email}" (password: ${DEMO_PASSWORD}) and board "${board.name}" with ${board.columns.length} columns and ${cardCount} cards`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
