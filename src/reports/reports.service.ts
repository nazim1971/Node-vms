import { Injectable } from '@nestjs/common';
import { AccountingService } from '../accounting/accounting.service';
import { PrismaService } from '../database/prisma.service';
import type { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  // ── Helper ─────────────────────────────────────────────────────────────────

  private dateRange(start?: Date, end?: Date) {
    if (!start && !end) return undefined;
    return {
      ...(start && { gte: start }),
      ...(end && { lte: end }),
    };
  }

  // ── Mileage Report ─────────────────────────────────────────────────────────
  /**
   * Total distance and trip count per vehicle.
   * Results sorted by totalDistance DESC.
   */
  async getMileageReport(tenantId: string, query: ReportQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const tripTimeRange = this.dateRange(startDate, endDate);

    const tripGroups = await this.prisma.trip.groupBy({
      by: ['vehicleId'],
      where: {
        tenantId,
        deletedAt: null,
        ...(query.vehicleId && { vehicleId: query.vehicleId }),
        ...(tripTimeRange && { startTime: tripTimeRange }),
      },
      _sum: { distance: true },
      _count: { _all: true },
      orderBy: { _sum: { distance: 'desc' } },
    });

    if (tripGroups.length === 0) return [];

    const vehicleIds = tripGroups.map((g: typeof tripGroups[number]) => g.vehicleId);
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, tenantId, deletedAt: null },
      select: { id: true, registrationNo: true, model: true },
    });
    const vehicleMap = new Map(vehicles.map((v: typeof vehicles[number]) => [v.id, v]));

    return tripGroups.map((g: typeof tripGroups[number]) => ({
      vehicleId: g.vehicleId,
      registrationNo: vehicleMap.get(g.vehicleId)?.registrationNo ?? 'Unknown',
      model: vehicleMap.get(g.vehicleId)?.model ?? 'Unknown',
      tripCount: g._count._all,
      totalDistance: g._sum.distance ?? 0,
    }));
  }

  // ── Fuel Report ────────────────────────────────────────────────────────────
  /**
   * Total liters consumed and fuel cost per vehicle.
   * Results sorted by totalCost DESC.
   */
  async getFuelReport(tenantId: string, query: ReportQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const fuelDateRange = this.dateRange(startDate, endDate);

    const fuelGroups = await this.prisma.fuelLog.groupBy({
      by: ['vehicleId'],
      where: {
        tenantId,
        deletedAt: null,
        ...(query.vehicleId && { vehicleId: query.vehicleId }),
        ...(fuelDateRange && { date: fuelDateRange }),
      },
      _sum: { liters: true, cost: true },
      _count: { _all: true },
      orderBy: { _sum: { cost: 'desc' } },
    });

    if (fuelGroups.length === 0) return [];

    const vehicleIds = fuelGroups.map((g: typeof fuelGroups[number]) => g.vehicleId);
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, tenantId, deletedAt: null },
      select: { id: true, registrationNo: true, model: true },
    });
    const vehicleMap = new Map(vehicles.map((v: typeof vehicles[number]) => [v.id, v]));

    return fuelGroups.map((g: typeof fuelGroups[number]) => ({
      vehicleId: g.vehicleId,
      registrationNo: vehicleMap.get(g.vehicleId)?.registrationNo ?? 'Unknown',
      model: vehicleMap.get(g.vehicleId)?.model ?? 'Unknown',
      fillupCount: g._count._all,
      totalLiters: g._sum.liters ?? 0,
      totalCost: g._sum.cost ?? 0,
    }));
  }

  // ── Profit/Loss Report ─────────────────────────────────────────────────────
  /**
   * Tenant-wide income vs. expenses breakdown.
   * Delegates to AccountingService (single source of truth).
   */
  async getProfitLossReport(tenantId: string, query: ReportQueryDto) {
    return this.accountingService.getProfitLoss(tenantId, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  // ── Vehicle Usage Report ───────────────────────────────────────────────────
  /**
   * Per-vehicle summary: trips, distance, income, fuel cost, maintenance cost.
   * Returns ALL tenant vehicles (zero-counts for idle vehicles).
   * Optional vehicleId filter for single-vehicle detail.
   */
  async getVehicleUsageReport(tenantId: string, query: ReportQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const tripTimeRange = this.dateRange(startDate, endDate);
    const fuelDateRange = this.dateRange(startDate, endDate);
    const maintDateRange = this.dateRange(startDate, endDate);

    const [vehicles, tripGroups, fuelGroups, maintGroups] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(query.vehicleId && { id: query.vehicleId }),
        },
        select: {
          id: true,
          registrationNo: true,
          model: true,
          status: true,
          sourceType: true,
        },
        orderBy: { registrationNo: 'asc' },
      }),

      this.prisma.trip.groupBy({
        by: ['vehicleId'],
        where: {
          tenantId,
          deletedAt: null,
          ...(query.vehicleId && { vehicleId: query.vehicleId }),
          ...(tripTimeRange && { startTime: tripTimeRange }),
        },
        _sum: { distance: true, income: true },
        _count: { _all: true },
      }),

      this.prisma.fuelLog.groupBy({
        by: ['vehicleId'],
        where: {
          tenantId,
          deletedAt: null,
          ...(query.vehicleId && { vehicleId: query.vehicleId }),
          ...(fuelDateRange && { date: fuelDateRange }),
        },
        _sum: { cost: true, liters: true },
        _count: { _all: true },
      }),

      this.prisma.maintenanceLog.groupBy({
        by: ['vehicleId'],
        where: {
          tenantId,
          deletedAt: null,
          ...(query.vehicleId && { vehicleId: query.vehicleId }),
          ...(maintDateRange && { date: maintDateRange }),
        },
        _sum: { totalCost: true },
        _count: { _all: true },
      }),
    ]);

    return vehicles.map((vehicle) => {
      const trips = tripGroups.find((g) => g.vehicleId === vehicle.id);
      const fuel = fuelGroups.find((g) => g.vehicleId === vehicle.id);
      const maint = maintGroups.find((g) => g.vehicleId === vehicle.id);

      return {
        vehicleId: vehicle.id,
        registrationNo: vehicle.registrationNo,
        model: vehicle.model,
        status: vehicle.status,
        sourceType: vehicle.sourceType,
        trips: {
          count: trips?._count._all ?? 0,
          totalDistance: trips?._sum.distance ?? 0,
          totalIncome: trips?._sum.income ?? 0,
        },
        fuel: {
          fillups: fuel?._count._all ?? 0,
          totalLiters: fuel?._sum.liters ?? 0,
          totalCost: fuel?._sum.cost ?? 0,
        },
        maintenance: {
          count: maint?._count._all ?? 0,
          totalCost: maint?._sum.totalCost ?? 0,
        },
      };
    });
  }
}
