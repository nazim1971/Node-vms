import { IsString } from 'class-validator';

export class CreateWorkshopJobDto {
  @IsString()
  vehicleId!: string;

  @IsString()
  issue!: string;
}
