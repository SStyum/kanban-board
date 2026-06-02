import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
    if (!column) throw new NotFoundException(`Column ${dto.columnId} not found`);

    const lastPosition = await this.prisma.card.aggregate({
      where: { columnId: dto.columnId },
      _max: { position: true },
    });
    const position = (lastPosition._max.position ?? -1) + 1;

    return this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        columnId: dto.columnId,
        position,
      },
    });
  }

  async update(id: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);

    if (dto.columnId && dto.columnId !== card.columnId) {
      const targetColumn = await this.prisma.column.findUnique({ where: { id: dto.columnId } });
      if (!targetColumn) throw new NotFoundException(`Column ${dto.columnId} not found`);
    }

    return this.prisma.card.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        columnId: dto.columnId,
        position: dto.position,
      },
    });
  }

  async remove(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    await this.prisma.card.delete({ where: { id } });
    return { id };
  }
}
