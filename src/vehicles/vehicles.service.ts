import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleSourceType, VehicleStatus } from '../../generated/prisma';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findFirst({
      where: { registrationNo: dto.registrationNo, deletedAt: null },
    });
    if (existing) throw new ConflictException('Registration number already in use');

    return this.prisma.vehicle.create({
      data: {
        tenantId,
        registrationNo: dto.registrationNo,
        model: dto.model,
        seatCount: dto.seatCount,
        status: VehicleStatus.AVAILABLE,
        sourceType: dto.sourceType ?? VehicleSourceType.OWNED,
      },
    });
  }

  async findAll(tenantId: string, status?: string) {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status: status as VehicleStatus }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
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
      const dup = await this.prisma.vehicle.findFirst({
        where: { registrationNo: dto.registrationNo, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictException('Registration number already in use');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
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
