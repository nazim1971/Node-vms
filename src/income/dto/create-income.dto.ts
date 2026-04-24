import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  @MinLength(2)
  source!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}
