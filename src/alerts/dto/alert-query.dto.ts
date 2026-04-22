import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export const ALERT_STATUSES = ['UNREAD', 'READ', 'DISMISSED'] as const;
export type AlertStatusFilter = (typeof ALERT_STATUSES)[number];

export class AlertQueryDto {
  @IsOptional()
  @IsIn(ALERT_STATUSES)
  status?: AlertStatusFilter;
}

export class ScanAlertsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  daysAhead?: number;
}
