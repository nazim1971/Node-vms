import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn([Role.DRIVER, Role.EMPLOYEE])
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Reassign user to a different branch (null to unassign) */
  @IsOptional()
  @IsString()
  branchId?: string | null;

  /** Replace multi-branch assignments for this user */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}
