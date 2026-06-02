import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';

const DEFAULT_COLUMNS = ['Todo', 'Doing', 'Done'];

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.board.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { columns: true } } },
    });
  }

  async findOne(id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
    if (!board) throw new NotFoundException(`Board ${id} not found`);
    return board;
  }

  create(dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        name: dto.name,
        columns: {
          create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })),
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: { cards: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.board.delete({ where: { id } });
    return { id };
  }
}
