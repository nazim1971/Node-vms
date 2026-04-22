import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  tenantName!: string;

  @IsString()
  adminName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
  })
  password!: string;
}
