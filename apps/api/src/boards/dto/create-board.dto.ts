import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
