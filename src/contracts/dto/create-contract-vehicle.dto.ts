import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { FuelType, VehicleSourceType } from '../../../generated/prisma';

export class CreateContractVehicleDto {
  @IsString()
  @MinLength(2)
  registrationNo!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  make?: string;

  @IsString()
  @MinLength(2)
  model!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  color?: string;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatCount?: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(VehicleSourceType)
  sourceType?: VehicleSourceType;
}
