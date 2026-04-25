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

    return this.prisma.vehicle.create({
      data: {
        tenantId,
        registrationNo: dto.registrationNo,
        model: dto.model,
        seatCount: dto.seatCount,
        status: VehicleStatus.AVAILABLE,
        sourceType: dto.sourceType ?? VehicleSourceType.OWNED,
        branchId: dto.branchId ?? null,
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
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.seatCount !== undefined) data.seatCount = dto.seatCount;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.sourceType !== undefined) data.sourceType = dto.sourceType;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    }

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
