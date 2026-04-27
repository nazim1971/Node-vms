import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import {
  ContractType,
  Prisma,
  VehicleSourceType,
  VehicleStatus,
} from '../../generated/prisma';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  async create(tenantId: string, dto: CreateVehicleDto) {
    // Registration numbers are globally unique (government plates)
    await this.validator.assertRegistrationUnique(dto.registrationNo);

    // Branch must belong to this tenant
    await this.validator.assertBranchExists(tenantId, dto.branchId);

    const sourceType = dto.sourceType ?? VehicleSourceType.OWNED;

    if (sourceType === VehicleSourceType.CONTRACT) {
      if (!dto.contract) {
        throw new BadRequestException(
          'contract is required when sourceType is CONTRACT',
        );
      }

      const contract = dto.contract;

      const start = new Date(contract.startDate);
      const end = new Date(contract.endDate);
      if (end <= start) {
        throw new BadRequestException('endDate must be after startDate');
      }

      // Atomic create: vehicle + source contract in a single transaction
      const created = await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.create({
          data: {
            tenantId,
            registrationNo: dto.registrationNo,
            make: dto.make,
            model: dto.model,
            year: dto.year,
            color: dto.color,
            fuelType: dto.fuelType,
            seatCount: dto.seatCount ?? 4,
            status: VehicleStatus.AVAILABLE,
            sourceType,
            branchId: dto.branchId ?? null,
            fitnessExpiryDate: dto.fitnessExpiryDate
              ? new Date(dto.fitnessExpiryDate)
              : null,
            taxTokenExpiryDate: dto.taxTokenExpiryDate
              ? new Date(dto.taxTokenExpiryDate)
              : null,
          },
        });

        await tx.contract.create({
          data: {
            tenantId,
            type: ContractType.VEHICLE_SOURCE,
            startDate: start,
            endDate: end,
            amount: contract.amount,
            commission: contract.commission ?? 0,
            vehicleId: vehicle.id,
            contactName: contract.contactName ?? null,
            contactEmail: contract.contactEmail ?? null,
            contactPhone: contract.contactPhone ?? null,
            contactAddress: contract.contactAddress ?? null,
          },
        });

        return vehicle;
      });

      return this.prisma.vehicle.findUniqueOrThrow({
        where: { id: created.id },
        include: { branch: { select: { id: true, name: true } } },
      });
    }

    return this.prisma.vehicle.create({
      data: {
        tenantId,
        registrationNo: dto.registrationNo,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        color: dto.color,
        fuelType: dto.fuelType,
        seatCount: dto.seatCount ?? 4,
        status: VehicleStatus.AVAILABLE,
        sourceType,
        branchId: dto.branchId ?? null,
        fitnessExpiryDate: dto.fitnessExpiryDate
          ? new Date(dto.fitnessExpiryDate)
          : null,
        taxTokenExpiryDate: dto.taxTokenExpiryDate
          ? new Date(dto.taxTokenExpiryDate)
          : null,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async findAll(tenantId: string, status?: string, branchId?: string) {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status: status as VehicleStatus }),
        ...(branchId && { branchId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (dto.registrationNo && dto.registrationNo !== vehicle.registrationNo) {
      await this.validator.assertRegistrationUnique(dto.registrationNo, id);
    }

    if (dto.branchId !== undefined) {
      await this.validator.assertBranchExists(tenantId, dto.branchId);
    }

    // Whitelist only safe updatable fields — never spread raw DTO
    const data: Prisma.VehicleUpdateInput = {};
    if (dto.registrationNo !== undefined)
      data.registrationNo = dto.registrationNo;
    if (dto.make !== undefined) data.make = dto.make;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.fuelType !== undefined) data.fuelType = dto.fuelType;
    if (dto.seatCount !== undefined) data.seatCount = dto.seatCount;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.sourceType !== undefined) data.sourceType = dto.sourceType;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    }
    if (dto.fitnessExpiryDate !== undefined)
      data.fitnessExpiryDate = dto.fitnessExpiryDate
        ? new Date(dto.fitnessExpiryDate)
        : null;
    if (dto.taxTokenExpiryDate !== undefined)
      data.taxTokenExpiryDate = dto.taxTokenExpiryDate
        ? new Date(dto.taxTokenExpiryDate)
        : null;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
