import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateFuelLogDto } from './dto/create-fuel-log.dto';

@Injectable()
export class FuelService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Add Fuel Log ─────────────────────────────────────────────────────────────
  async addLog(tenantId: string, dto: CreateFuelLogDto) {
    // Validate vehicle exists within tenant
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Odometer validation: must be >= last recorded reading
    const lastLog = await this.prisma.fuelLog.findFirst({
      where: { vehicleId: dto.vehicleId, tenantId, deletedAt: null },
      orderBy: { odometer: 'desc' },
      select: { odometer: true },
    });
    if (lastLog && dto.odometer < lastLog.odometer) {
      throw new BadRequestException(
        `Odometer reading (${dto.odometer}) cannot be less than the last recorded reading (${lastLog.odometer})`,
      );
    }

    return this.prisma.fuelLog.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        liters: dto.liters,
        cost: dto.cost,
        odometer: dto.odometer,
        date: new Date(dto.date),
      },
      select: fuelLogSelect,
    });
  }

  // ─── List Fuel Logs ───────────────────────────────────────────────────────────
  async listLogs(tenantId: string, vehicleId?: string) {
    return this.prisma.fuelLog.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(vehicleId && { vehicleId }),
      },
      select: fuelLogSelect,
      orderBy: { date: 'desc' },
    });
  }
}

// ─── Shared select projection ────────────────────────────────────────────────
const fuelLogSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  liters: true,
  cost: true,
  odometer: true,
  date: true,
  createdAt: true,
} as const;
