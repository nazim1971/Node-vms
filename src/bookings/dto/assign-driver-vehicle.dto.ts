import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AssignDriverVehicleDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePaid?: number;
}
