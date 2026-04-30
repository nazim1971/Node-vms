import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export const DOCUMENT_TYPES = [
  'REGISTRATION',
  'INSURANCE',
  'FITNESS',
  'TAX_TOKEN',
  'EMISSION',
  'PERMIT',
  'ROUTE_PERMIT',
  'OTHER',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class CreateDocumentDto {
  @IsString()
  vehicleId!: string;

  @IsIn(DOCUMENT_TYPES)
  type!: DocumentType;

  @IsOptional()
  @IsString()
  documentNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  expiryDate!: string;
}
