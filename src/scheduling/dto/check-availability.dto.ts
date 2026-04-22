import { IsDateString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
