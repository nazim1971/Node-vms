import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import {
  FuelType,
  VehicleSourceType,
  VehicleStatus,
} from '../../../generated/prisma';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  registrationNo?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  make?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  model?: string;

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
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsEnum(VehicleSourceType)
  sourceType?: VehicleSourceType;

  /** Reassign vehicle to a different branch (null to unassign) */
  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsDateString()
  fitnessExpiryDate?: string | null;

  @IsOptional()
  @IsDateString()
  taxTokenExpiryDate?: string | null;
}
