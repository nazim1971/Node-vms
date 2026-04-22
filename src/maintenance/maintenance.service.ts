import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Maintenance Log ───────────────────────────────────────────────
  /**
   * Two modes:
   * - Simple:    provide totalCost directly (no items)
   * - Breakdown: provide items[] — totalCost is auto-calculated as their sum
   * At least one of totalCost or items must be supplied.
   */
  async create(tenantId: string, dto: CreateMaintenanceLogDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const items = dto.items ?? [];
    let totalCost: number;

    if (items.length > 0) {
      // Breakdown mode: sum item costs
      totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    } else if (dto.totalCost !== undefined) {
      // Simple mode: use provided totalCost
      totalCost = dto.totalCost;
    } else {
      throw new BadRequestException(
        'Provide either totalCost (simple) or items[] (breakdown)',
      );
    }

    return this.prisma.maintenanceLog.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        totalCost,
        note: dto.note ?? null,
        date: new Date(dto.date),
        ...(items.length > 0 && {
          items: { create: items.map((i) => ({ name: i.name, cost: i.cost })) },
        }),
      },
      select: maintenanceLogSelect,
    });
  }

  // ─── List Maintenance Logs ──────────────────────────────────────────────
  async findAll(tenantId: string, vehicleId?: string) {
    return this.prisma.maintenanceLog.findMany({
      where: { tenantId, deletedAt: null, ...(vehicleId && { vehicleId }) },
      select: maintenanceLogSelect,
      orderBy: { date: 'desc' },
    });
  }

  // ─── Get Single Log (with item breakdown) ─────────────────────────────
  async findOne(tenantId: string, id: string) {
    const log = await this.prisma.maintenanceLog.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: maintenanceLogSelect,
    });
    if (!log) throw new NotFoundException('Maintenance log not found');
    return log;
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const maintenanceLogSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  totalCost: true,
  note: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, name: true, cost: true },
  },
} as const;
