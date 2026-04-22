import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const EXPENSE_TYPES = [
  'FUEL',
  'MAINTENANCE',
  'DRIVER',
  'OTHER',
] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export class CreateExpenseDto {
  @IsIn(EXPENSE_TYPES)
  type!: ExpenseType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
