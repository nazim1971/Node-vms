import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateIncomeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  source?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
