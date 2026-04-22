import { IsDateString, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  vehicleId!: string;

  @IsString()
  type!: string;

  @IsDateString()
  expiryDate!: string;
}
