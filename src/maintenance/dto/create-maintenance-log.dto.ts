import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMaintenanceItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  cost!: number;
}

export class CreateMaintenanceLogDto {
  @IsString()
  vehicleId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  note?: string;

  /**
   * Provide either totalCost (simple) OR items[] (breakdown).
   * If items[] is provided, totalCost is calculated automatically.
   * At least one of the two must be present.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceItemDto)
  items?: CreateMaintenanceItemDto[];
}
