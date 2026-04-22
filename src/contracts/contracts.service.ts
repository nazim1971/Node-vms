import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractType } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateContractDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // VEHICLE_SOURCE contracts should reference a vehicle
    if (dto.type === 'VEHICLE_SOURCE' && !dto.vehicleId) {
      throw new BadRequestException(
        'vehicleId is required for VEHICLE_SOURCE contracts',
      );
    }

    // Validate vehicle belongs to tenant if vehicleId provided
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.contract.create({
      data: {
        tenantId,
        type: dto.type,
        startDate: start,
        endDate: end,
        amount: dto.amount,
        commission: dto.commission ?? 0,
        vehicleId: dto.vehicleId ?? null,
      },
      select: contractSelect,
    });
  }

  // ─── List All ────────────────────────────────────────────────────────────
  async findAll(tenantId: string, type?: string) {
    const validType =
      type === 'VEHICLE_SOURCE' || type === 'CLIENT' ? type : undefined;

    return this.prisma.contract.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(validType && { type: validType }),
      },
      select: contractSelect,
      orderBy: { endDate: 'asc' },
    });
  }

  // ─── Get One ─────────────────────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: contractSelect,
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  // ─── Update ─────────────────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateContractDto) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const newStart = dto.startDate
      ? new Date(dto.startDate)
      : contract.startDate;
    const newEnd = dto.endDate ? new Date(dto.endDate) : contract.endDate;

    if (newEnd <= newStart) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // Validate new vehicle belongs to tenant if being changed
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        startDate: newStart,
        endDate: newEnd,
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.commission !== undefined && { commission: dto.commission }),
        ...(dto.vehicleId !== undefined && { vehicleId: dto.vehicleId }),
      },
      select: contractSelect,
    });
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Expiring Contracts ────────────────────────────────────────────────────
  /**
   * Returns contracts whose endDate falls within the next `daysAhead` days.
   * Only includes active (non-deleted) contracts expiring in the future.
   */
  async findExpiring(tenantId: string, daysAhead: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);

    return this.prisma.contract.findMany({
      where: {
        tenantId,
        deletedAt: null,
        endDate: { gte: now, lte: threshold },
      },
      select: contractSelect,
      orderBy: { endDate: 'asc' },
    });
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const contractSelect = {
  id: true,
  tenantId: true,
  type: true,
  startDate: true,
  endDate: true,
  amount: true,
  commission: true,
  vehicleId: true,
  createdAt: true,
  updatedAt: true,
} as const;
