import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Expense ───────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        tenantId,
        type: dto.type,
        amount: dto.amount,
        note: dto.note ?? null,
      },
      select: expenseSelect,
    });
  }

  // ─── List Expenses ────────────────────────────────────────────────────────────
  async findAll(tenantId: string, type?: string) {
    return this.prisma.expense.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(type && { type }),
      },
      select: expenseSelect,
      orderBy: { createdAt: 'desc' },
    });
  }
}

// ─── Shared select projection ────────────────────────────────────────────────
const expenseSelect = {
  id: true,
  tenantId: true,
  type: true,
  amount: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;
