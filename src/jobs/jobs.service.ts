import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { AlertStatus, VehicleStatus } from '../../generated/prisma';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'vms-jobs';
const OFFLINE_THRESHOLD_MINUTES = 30;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly config: ConfigService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async onModuleInit() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    };

    this.queue = new Queue(QUEUE_NAME, { connection });

    this.worker = new Worker(QUEUE_NAME, async (job) => this.processJob(job), {
      connection,
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Completed: ${job.name} [${job.id ?? ''}]`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Failed: ${job?.name ?? 'unknown'} — ${err.message}`);
    });

    await this.scheduleJobs();
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  // ─── Scheduler ────────────────────────────────────────────────────────────

  /**
   * Clears existing repeatable jobs (idempotent on restart) then re-schedules:
   *   - daily-alerts-scan : 06:00 UTC daily  (maintenance / doc / contract expiry)
   *   - offline-detection : every 15 minutes (ON_TRIP vehicles with no GPS)
   */
  private async scheduleJobs() {
    const existing = await this.queue.getRepeatableJobs();
    for (const job of existing) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    await this.queue.add(
      'daily-alerts-scan',
      {},
      { repeat: { pattern: '0 6 * * *' } },
    );

    await this.queue.add(
      'offline-detection',
      {},
      { repeat: { every: OFFLINE_THRESHOLD_MINUTES * 2 * 60 * 1000 } },
    );

    this.logger.log(
      'Scheduled: daily-alerts-scan (06:00 UTC), offline-detection (every 60 min)',
    );
  }

  // ─── Job Router ───────────────────────────────────────────────────────────

  private async processJob(job: Job) {
    this.logger.log(`Processing: ${job.name}`);
    switch (job.name) {
      case 'daily-alerts-scan':
        await this.runDailyAlertsScan();
        break;
      case 'offline-detection':
        await this.runOfflineDetection();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  // ─── Job: Daily Alerts Scan ───────────────────────────────────────────────
  /**
   * Runs AlertsService.scan() for every active tenant.
   * Covers all three alert types in one pass:
   *   DOCUMENT_EXPIRY  — documents expiring within 30 days
   *   CONTRACT_EXPIRY  — contracts expiring within 30 days
   *   MAINTENANCE_DUE  — vehicles with no maintenance in 90 days
   */
  private async runDailyAlertsScan() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });

    this.logger.log(`Daily scan started for ${tenants.length} tenant(s)`);

    for (const tenant of tenants) {
      try {
        const result = await this.alertsService.scan(tenant.id, 30);
        if (result.created > 0) {
          this.logger.log(
            `[${tenant.name}] +${result.created} alert(s) — ` +
              `docs:${result.summary.documentExpiry} ` +
              `contracts:${result.summary.contractExpiry} ` +
              `maintenance:${result.summary.maintenanceDue}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Scan failed for tenant ${tenant.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  // ─── Job: Offline Detection ───────────────────────────────────────────────
  /**
   * Finds all ON_TRIP vehicles.
   * For each, checks last GpsLocation timestamp.
   * Creates a VEHICLE_OFFLINE alert if no GPS received in OFFLINE_THRESHOLD_MINUTES.
   * Deduplicates: skips if an UNREAD VEHICLE_OFFLINE alert was created in the last hour.
   */
  private async runOfflineDetection() {
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - OFFLINE_THRESHOLD_MINUTES);

    const onTripVehicles = await this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.ON_TRIP, deletedAt: null },
      select: { id: true, tenantId: true, registrationNo: true },
    });

    if (onTripVehicles.length === 0) return;

    const alertsToCreate: Array<{
      tenantId: string;
      type: string;
      message: string;
      status: AlertStatus;
    }> = [];

    for (const vehicle of onTripVehicles) {
      const lastGps = await this.prisma.gpsLocation.findFirst({
        where: { vehicleId: vehicle.id, tenantId: vehicle.tenantId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      const isOffline = !lastGps || lastGps.timestamp < threshold;
      if (!isOffline) continue;

      // Dedup: skip if an UNREAD VEHICLE_OFFLINE alert already exists within the last hour
      const duplicate = await this.prisma.alert.findFirst({
        where: {
          tenantId: vehicle.tenantId,
          type: 'VEHICLE_OFFLINE',
          status: AlertStatus.UNREAD,
          message: { contains: vehicle.registrationNo },
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (duplicate) continue;

      alertsToCreate.push({
        tenantId: vehicle.tenantId,
        type: 'VEHICLE_OFFLINE',
        message: `Vehicle ${vehicle.registrationNo} is offline — no GPS update for ${OFFLINE_THRESHOLD_MINUTES}+ minutes`,
        status: AlertStatus.UNREAD,
      });
    }

    if (alertsToCreate.length > 0) {
      await this.prisma.alert.createMany({ data: alertsToCreate });
      this.logger.log(
        `Offline detection: created ${alertsToCreate.length} alert(s)`,
      );
    }
  }
}
