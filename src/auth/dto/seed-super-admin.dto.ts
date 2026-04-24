import { IsEmail, IsString, MinLength } from 'class-validator';

export class SeedSuperAdminDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Must match SEED_SECRET environment variable */
  @IsString()
  seedSecret!: string;
}
