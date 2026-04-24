import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FeatureAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.featureAccess.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { moduleName: 'asc' },
    });
  }

  async enable(tenantId: string, moduleName: string) {
    const existing = await this.prisma.featureAccess.findFirst({
      where: { tenantId, moduleName, deletedAt: null },
    });

    if (existing) {
      return this.prisma.featureAccess.update({
        where: { id: existing.id },
        data: { isEnabled: true },
      });
    }

    return this.prisma.featureAccess.create({
      data: { tenantId, moduleName, isEnabled: true },
    });
  }

  async disable(tenantId: string, moduleName: string) {
    const existing = await this.prisma.featureAccess.findFirst({
      where: { tenantId, moduleName, deletedAt: null },
    });

    if (existing) {
      return this.prisma.featureAccess.update({
        where: { id: existing.id },
        data: { isEnabled: false },
      });
    }

    return this.prisma.featureAccess.create({
      data: { tenantId, moduleName, isEnabled: false },
    });
  }
}
