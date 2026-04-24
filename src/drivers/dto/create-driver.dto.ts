import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  licenseNo!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /** Assign driver to a specific branch */
  @IsOptional()
  @IsString()
  branchId?: string;
}
