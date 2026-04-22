import { IsNumber, IsString, Min } from 'class-validator';

export class AddWorkshopItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  cost!: number;
}
