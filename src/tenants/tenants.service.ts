import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        subscriptions: {
          where: { isActive: true, deletedAt: null },
          select: { planName: true, isActive: true },
          take: 1,
        },
        _count: { select: { users: true, vehicles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: {
          where: { deletedAt: null },
          select: { id: true, planName: true, isActive: true, createdAt: true },
        },
        featureAccesses: {
          where: { deletedAt: null },
          select: { moduleName: true, isEnabled: true },
        },
        _count: { select: { users: true, vehicles: true, drivers: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
