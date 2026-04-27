import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FuelType, VehicleSourceType } from '../../../generated/prisma';
import { CreateVehicleSourceContractDto } from './create-vehicle-source-contract.dto';

export class CreateVehicleDto {
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
  @IsEnum(VehicleSourceType)
  sourceType?: VehicleSourceType;

  /** Assign vehicle to a specific branch */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  fitnessExpiryDate?: string;

  @IsOptional()
  @IsDateString()
  taxTokenExpiryDate?: string;

  /**
   * Optional: if sourceType is CONTRACT, frontend can submit contract data here
   * and backend will create contract + vehicle atomically.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateVehicleSourceContractDto)
  contract?: CreateVehicleSourceContractDto;
}
