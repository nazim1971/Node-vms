import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractType,
  VehicleSourceType,
  VehicleStatus,
} from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateContractDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // VEHICLE_SOURCE contracts should reference an existing vehicle or include a new vehicle payload
    if (
      dto.type === ContractType.VEHICLE_SOURCE &&
      !dto.vehicleId &&
      !dto.vehicle
    ) {
      throw new BadRequestException(
        'Provide vehicleId or vehicle for VEHICLE_SOURCE contracts',
      );
    }

    if (dto.vehicleId && dto.vehicle) {
      throw new BadRequestException(
        'Provide only one of vehicleId or vehicle, not both',
      );
    }

    // VEHICLE_SOURCE + vehicle payload => create vehicle and contract atomically
    if (dto.type === ContractType.VEHICLE_SOURCE && dto.vehicle) {
      const vehicleInput = dto.vehicle;

      await this.validator.assertRegistrationUnique(
        vehicleInput.registrationNo,
      );
      await this.validator.assertBranchExists(tenantId, vehicleInput.branchId);

      return this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.create({
          data: {
            tenantId,
            registrationNo: vehicleInput.registrationNo,
            make: vehicleInput.make,
            model: vehicleInput.model,
            year: vehicleInput.year,
            color: vehicleInput.color,
            fuelType: vehicleInput.fuelType,
            seatCount: vehicleInput.seatCount ?? 4,
            status: VehicleStatus.AVAILABLE,
            sourceType: VehicleSourceType.CONTRACT,
            branchId: vehicleInput.branchId ?? null,
          },
          select: { id: true },
        });

        return tx.contract.create({
          data: {
            tenantId,
            type: ContractType.VEHICLE_SOURCE,
            startDate: start,
            endDate: end,
            amount: dto.amount,
            commission: dto.commission ?? 0,
            vehicleId: vehicle.id,
            contactName: dto.contactName ?? null,
            contactEmail: dto.contactEmail ?? null,
            contactPhone: dto.contactPhone ?? null,
            contactAddress: dto.contactAddress ?? null,
          },
          select: contractSelect,
        });
      });
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
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
        contactAddress: dto.contactAddress ?? null,
      },
      select: contractSelect,
    });
  }

  // ─── List All ────────────────────────────────────────────────────────────
  async findAll(tenantId: string, type?: string) {
    const validType =
      type === ContractType.VEHICLE_SOURCE || type === ContractType.CLIENT
        ? type
        : undefined;

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
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone,
        }),
        ...(dto.contactAddress !== undefined && {
          contactAddress: dto.contactAddress,
        }),
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
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  contactAddress: true,
  createdAt: true,
  updatedAt: true,
} as const;
