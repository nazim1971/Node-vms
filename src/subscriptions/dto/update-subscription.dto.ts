import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  planName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
