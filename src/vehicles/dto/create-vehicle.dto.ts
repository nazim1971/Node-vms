import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { VehicleSourceType } from '../../../generated/prisma';

export class CreateVehicleDto {
  @IsString()
  @MinLength(2)
  registrationNo!: string;

  @IsString()
  @MinLength(2)
  model!: string;

  @IsInt()
  @Min(1)
  seatCount!: number;

  @IsOptional()
  @IsEnum(VehicleSourceType)
  sourceType?: VehicleSourceType;
}
