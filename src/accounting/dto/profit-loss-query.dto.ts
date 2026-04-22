import { IsDateString, IsOptional } from 'class-validator';

export class ProfitLossQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
