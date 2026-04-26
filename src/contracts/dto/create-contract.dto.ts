import {
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContractVehicleDto } from './create-contract-vehicle.dto';

export const CONTRACT_TYPES = ['VEHICLE_SOURCE', 'CLIENT'] as const;
export type ContractTypeValue = (typeof CONTRACT_TYPES)[number];

export class CreateContractDto {
  @IsIn(CONTRACT_TYPES)
  type!: ContractTypeValue;

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

  /**
   * Required for VEHICLE_SOURCE contracts; optional for CLIENT contracts.
   */
  @IsOptional()
  @IsString()
  vehicleId?: string;

  /**
   * VEHICLE_SOURCE only: create a new vehicle and contract together atomically.
   * Use either vehicleId (existing vehicle) OR vehicle (new vehicle payload).
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateContractVehicleDto)
  vehicle?: CreateContractVehicleDto;
}
