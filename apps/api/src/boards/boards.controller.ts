import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  list() {
    return this.boards.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.boards.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBoardDto) {
    return this.boards.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boards.remove(id);
  }
}
