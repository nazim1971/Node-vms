import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ProfitLossQueryDto } from './dto/profit-loss-query.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate profit/loss for a tenant within an optional date range.
   *
   * Income sources:
   *   - Income records (income.amount)
   *   - Trip income (trip.income)
   *
   * Expense sources:
   *   - Expense records (expense.amount)
   *   - Fuel logs (fuelLog.cost)
   *   - Maintenance logs (maintenanceLog.totalCost)
   *   - Trip toll costs (trip.tollCost)
   *   - Trip police costs (trip.policeCost)
   */
  async getProfitLoss(tenantId: string, query: ProfitLossQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const dateRange = (gte?: Date, lte?: Date) => ({
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    });

    // ── Income aggregations ───────────────────────────────────────────────────
    const [incomeAgg, tripAgg] = await Promise.all([
      this.prisma.income.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          ...(startDate || endDate
            ? { createdAt: dateRange(startDate, endDate) }
            : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.trip.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          ...(startDate || endDate
            ? { startTime: dateRange(startDate, endDate) }
            : {}),
        },
        _sum: { income: true, tollCost: true, policeCost: true },
      }),
    ]);

    // ── Expense aggregations ──────────────────────────────────────────────────
    const [expenseAgg, fuelAgg, maintenanceAgg] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          ...(startDate || endDate
            ? { createdAt: dateRange(startDate, endDate) }
            : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          ...(startDate || endDate
            ? { date: dateRange(startDate, endDate) }
            : {}),
        },
        _sum: { cost: true },
      }),
      this.prisma.maintenanceLog.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          ...(startDate || endDate
            ? { date: dateRange(startDate, endDate) }
            : {}),
        },
        _sum: { totalCost: true },
      }),
    ]);

    // ── Totals ────────────────────────────────────────────────────────────────
    const incomeFromRecords = incomeAgg._sum.amount ?? 0;
    const incomeFromTrips = tripAgg._sum.income ?? 0;
    const totalIncome = incomeFromRecords + incomeFromTrips;

    const expenseFromRecords = expenseAgg._sum.amount ?? 0;
    const fuelCosts = fuelAgg._sum.cost ?? 0;
    const maintenanceCosts = maintenanceAgg._sum.totalCost ?? 0;
    const tripTollCosts = tripAgg._sum.tollCost ?? 0;
    const tripPoliceCosts = tripAgg._sum.policeCost ?? 0;
    const totalExpenses =
      expenseFromRecords +
      fuelCosts +
      maintenanceCosts +
      tripTollCosts +
      tripPoliceCosts;

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      breakdown: {
        incomeFromRecords,
        incomeFromTrips,
        expenseFromRecords,
        fuelCosts,
        maintenanceCosts,
        tripTollCosts,
        tripPoliceCosts,
      },
      period: {
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
      },
    };
  }
}
