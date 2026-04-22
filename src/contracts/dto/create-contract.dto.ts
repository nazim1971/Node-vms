import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
}
