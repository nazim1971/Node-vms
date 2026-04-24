import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        planName: dto.planName,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.subscription.findMany({
      where: { deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.subscription.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, deletedAt: null },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.subscription.update({
      where: { id },
      data: dto,
    });
  }
}
