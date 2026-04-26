import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVehicleSourceContractDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;
}
