import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn([Role.DRIVER, Role.EMPLOYEE])
  role?: Role;

  /** Assign user to a specific branch */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Assign user to multiple branches */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}
