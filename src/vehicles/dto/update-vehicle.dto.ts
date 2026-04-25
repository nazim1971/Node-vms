import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { VehicleSourceType, VehicleStatus } from '../../../generated/prisma';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  registrationNo?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  model?: string;

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
}
