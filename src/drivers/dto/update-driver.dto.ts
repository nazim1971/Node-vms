import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNo?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  /** Reassign driver to a different branch (null to unassign) */
  @IsOptional()
  @IsString()
  branchId?: string | null;
}
