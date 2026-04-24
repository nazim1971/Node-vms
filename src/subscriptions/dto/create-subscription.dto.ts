import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  @MinLength(2)
  planName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
