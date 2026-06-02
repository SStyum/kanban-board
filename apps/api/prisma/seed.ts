import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.card.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();

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
    `[seed] board "${board.name}" with ${board.columns.length} columns and ${cardCount} cards`,
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
