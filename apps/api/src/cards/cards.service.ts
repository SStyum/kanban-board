import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../boards/board.gateway';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BoardGateway,
  ) {}

  async create(dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
    if (!column) throw new NotFoundException(`Column ${dto.columnId} not found`);

    const lastPosition = await this.prisma.card.aggregate({
      where: { columnId: dto.columnId },
      _max: { position: true },
    });
    const position = (lastPosition._max.position ?? -1) + 1;

    const card = await this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        columnId: dto.columnId,
        position,
      },
    });

    this.gateway.emitCardCreated({
      boardId: column.boardId,
      columnId: column.id,
      card,
    });

    return card;
  }

  async update(id: string, dto: UpdateCardDto) {
    const existing = await this.prisma.card.findUnique({
      where: { id },
      include: { column: true },
    });
    if (!existing) throw new NotFoundException(`Card ${id} not found`);

    if (dto.columnId && dto.columnId !== existing.columnId) {
      const targetColumn = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
      if (!targetColumn) throw new NotFoundException(`Column ${dto.columnId} not found`);
      if (targetColumn.boardId !== existing.column.boardId) {
        throw new BadRequestException('Cannot move a card across boards');
      }
    }

    const updated = await this.prisma.card.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        columnId: dto.columnId,
        position: dto.position,
      },
    });

    const moved = dto.columnId !== undefined || dto.position !== undefined;
    if (moved) {
      this.gateway.emitCardMoved({
        boardId: existing.column.boardId,
        fromColumnId: existing.columnId,
        toColumnId: updated.columnId,
        card: updated,
      });
    }

    return updated;
  }

  async remove(id: string) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { column: true },
    });
    if (!card) throw new NotFoundException(`Card ${id} not found`);

    await this.prisma.card.delete({ where: { id } });

    this.gateway.emitCardDeleted({
      boardId: card.column.boardId,
      columnId: card.columnId,
      cardId: card.id,
    });

    return { id };
  }
}
