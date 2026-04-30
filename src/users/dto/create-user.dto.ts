import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
  })
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
