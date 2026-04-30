import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message:
      'Phone must be a valid phone number (7–20 digits, optional +, spaces, dashes, parentheses)',
  })
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
