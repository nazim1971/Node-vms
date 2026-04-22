import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class CreateFuelLogDto {
  @IsString()
  vehicleId!: string;

  @IsNumber()
  @Min(0.01)
  liters!: number;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsNumber()
  @Min(0)
  odometer!: number;

  @IsDateString()
  date!: string;
}
