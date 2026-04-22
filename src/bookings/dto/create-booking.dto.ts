import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsString()
  @MinLength(5)
  contact!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePaid?: number;
}
