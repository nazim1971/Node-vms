import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, VehicleStatus } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import type { AlertStatusFilter } from './dto/alert-query.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Alerts ──────────────────────────────────────────────────────────────
  async findAll(tenantId: string, status?: AlertStatusFilter) {
    return this.prisma.alert.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status: status }),
      },
      select: alertSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Mark Read ──────────────────────────────────────────────────────────────
  markRead(tenantId: string, alertId: string) {
    return this.updateStatus(tenantId, alertId, AlertStatus.READ);
  }

  // ─── Dismiss ───────────────────────────────────────────────────────────────
  dismiss(tenantId: string, alertId: string) {
    return this.updateStatus(tenantId, alertId, AlertStatus.DISMISSED);
  }

  // ─── Scan and Generate Alerts ─────────────────────────────────────────────
  /**
   * Scans the tenant data and creates Alert records for:
   * 1. DOCUMENT_EXPIRY  — documents expiring within daysAhead days
   * 2. CONTRACT_EXPIRY  — contracts expiring within daysAhead days
   * 3. MAINTENANCE_DUE  — active vehicles with no maintenance in last 90 days
   */
  async scan(tenantId: string, daysAhead: number = 30) {
    const now = new Date();

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

    const maintenanceThreshold = new Date();
    maintenanceThreshold.setDate(maintenanceThreshold.getDate() - 90);

    const [expiringDocs, expiringContracts, vehiclesNeedingMaintenance] =
      await Promise.all([
        // Documents expiring within daysAhead
        this.prisma.document.findMany({
          where: {
            tenantId,
            deletedAt: null,
            expiryDate: { gte: now, lte: expiryThreshold },
          },
          select: {
            id: true,
            type: true,
            expiryDate: true,
            vehicle: { select: { registrationNo: true } },
          },
        }),
        // Contracts expiring within daysAhead
        this.prisma.contract.findMany({
          where: {
            tenantId,
            deletedAt: null,
            endDate: { gte: now, lte: expiryThreshold },
          },
          select: { id: true, type: true, endDate: true },
        }),
        // Active vehicles with no maintenance log in the last 90 days
        this.prisma.vehicle.findMany({
          where: {
            tenantId,
            deletedAt: null,
            status: { not: VehicleStatus.INACTIVE },
            maintenanceLogs: {
              none: { date: { gte: maintenanceThreshold }, deletedAt: null },
            },
          },
          select: { id: true, registrationNo: true },
        }),
      ]);

    const alertData = [
       ...expiringDocs.map((doc: typeof expiringDocs[number]) => ({
        tenantId,
        type: 'DOCUMENT_EXPIRY',
        message: `${doc.type} document for vehicle ${doc.vehicle.registrationNo} expires on ${doc.expiryDate.toISOString().split('T')[0]}`,
        status: AlertStatus.UNREAD,
      })),
       ...expiringContracts.map((c: typeof expiringContracts[number]) => ({
        tenantId,
        type: 'CONTRACT_EXPIRY',
        message: `${c.type} contract expires on ${c.endDate.toISOString().split('T')[0]}`,
        status: AlertStatus.UNREAD,
      })),
       ...vehiclesNeedingMaintenance.map((v: typeof vehiclesNeedingMaintenance[number]) => ({
        tenantId,
        type: 'MAINTENANCE_DUE',
        message: `Vehicle ${v.registrationNo} has had no maintenance in the last 90 days`,
        status: AlertStatus.UNREAD,
      })),
    ];

    if (alertData.length > 0) {
      await this.prisma.alert.createMany({ data: alertData });
    }

    return {
      created: alertData.length,
      summary: {
        documentExpiry: expiringDocs.length,
        contractExpiry: expiringContracts.length,
        maintenanceDue: vehiclesNeedingMaintenance.length,
      },
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────
  private async updateStatus(
    tenantId: string,
    alertId: string,
    status: AlertStatus,
  ) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!alert) throw new NotFoundException('Alert not found');

    return this.prisma.alert.update({
      where: { id: alertId },
      data: { status },
      select: alertSelect,
    });
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const alertSelect = {
  id: true,
  tenantId: true,
  type: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
