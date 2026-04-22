import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  tollCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  policeCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  income?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;
}
