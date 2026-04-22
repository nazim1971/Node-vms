import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Document ─────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateDocumentDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.document.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        type: dto.type,
        expiryDate: new Date(dto.expiryDate),
      },
      select: documentSelect,
    });
  }

  // ─── List Documents ─────────────────────────────────────────────────────
  async findAll(tenantId: string, vehicleId?: string) {
    return this.prisma.document.findMany({
      where: { tenantId, deletedAt: null, ...(vehicleId && { vehicleId }) },
      select: documentSelect,
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ─── Find Expiring Documents ────────────────────────────────────────────
  /**
   * Returns documents whose expiryDate falls within the next `daysAhead` days
   * (from now up to now + daysAhead). Includes already-expired documents when
   * daysAhead = 0 is not used — use GET /documents for a full list instead.
   */
  async findExpiring(tenantId: string, daysAhead: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);

    return this.prisma.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        expiryDate: { gte: now, lte: threshold },
      },
      select: documentSelect,
      orderBy: { expiryDate: 'asc' },
    });
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const documentSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  type: true,
  expiryDate: true,
  createdAt: true,
  updatedAt: true,
} as const;
