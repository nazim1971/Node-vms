import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget audit entry creation.
   * Called from AuditInterceptor — must never throw to the caller.
   */
  async log(
    tenantId: string,
    userId: string,
    action: string,
    entity: string,
    entityId: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { tenantId, userId, action, entity, entityId },
    });
  }

  async findAll(tenantId: string, query: AuditQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(query.entity && { entity: query.entity }),
        ...(query.entityId && { entityId: query.entityId }),
        ...(query.userId && { userId: query.userId }),
        ...((startDate ?? endDate)
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
