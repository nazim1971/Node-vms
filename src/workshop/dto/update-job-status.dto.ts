import { IsIn } from 'class-validator';
import { WorkshopJobStatus } from '../../../generated/prisma';

export const ALLOWED_TRANSITIONS = [
  WorkshopJobStatus.IN_PROGRESS,
  WorkshopJobStatus.COMPLETED,
  WorkshopJobStatus.CANCELLED,
] as const;

export class UpdateJobStatusDto {
  @IsIn(ALLOWED_TRANSITIONS)
  status!: WorkshopJobStatus;
}
