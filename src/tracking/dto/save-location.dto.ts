import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveLocationDto {
  @IsString()
  vehicleId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;
}
