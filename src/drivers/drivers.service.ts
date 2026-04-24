import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDriverDto) {
    const existingPhone = await this.prisma.driver.findFirst({
      where: { phone: dto.phone, deletedAt: null },
    });
    if (existingPhone) throw new ConflictException('Phone number already in use');

    const existingLicense = await this.prisma.driver.findFirst({
      where: { licenseNo: dto.licenseNo, deletedAt: null },
    });
    if (existingLicense) throw new ConflictException('License number already in use');

    return this.prisma.driver.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        licenseNo: dto.licenseNo,
        userId: dto.userId ?? null,
        branchId: dto.branchId ?? null,
      },
    });
  }

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    if (dto.phone && dto.phone !== driver.phone) {
      const dup = await this.prisma.driver.findFirst({
        where: { phone: dto.phone, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictException('Phone number already in use');
    }

    if (dto.licenseNo && dto.licenseNo !== driver.licenseNo) {
      const dup = await this.prisma.driver.findFirst({
        where: { licenseNo: dto.licenseNo, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictException('License number already in use');
    }

    return this.prisma.driver.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
