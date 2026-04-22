import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkshopJobStatus } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import type { AddWorkshopItemDto } from './dto/add-item.dto';
import type { CreateWorkshopJobDto } from './dto/create-job.dto';

@Injectable()
export class WorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Job Card ──────────────────────────────────────────────────
  async createJob(tenantId: string, dto: CreateWorkshopJobDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.workshopJob.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        issue: dto.issue,
        status: WorkshopJobStatus.OPEN,
        totalCost: 0,
      },
      select: jobSelect,
    });
  }

  // ─── List Jobs ────────────────────────────────────────────────────────────
  async findAll(tenantId: string, status?: WorkshopJobStatus) {
    return this.prisma.workshopJob.findMany({
      where: { tenantId, deletedAt: null, ...(status && { status }) },
      select: jobSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get Single Job (full bill view) ──────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: jobSelect,
    });
    if (!job) throw new NotFoundException('Workshop job not found');
    return job;
  }

  // ─── Add Part / Labor Item ─────────────────────────────────────────────
  async addItem(tenantId: string, jobId: string, dto: AddWorkshopItemDto) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id: jobId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!job) throw new NotFoundException('Workshop job not found');
    if (job.status === WorkshopJobStatus.COMPLETED) {
      throw new BadRequestException('Cannot add items to a completed job');
    }

    // Atomically create item + increment totalCost on the parent job
    const [, updatedJob] = await this.prisma.$transaction([
      this.prisma.workshopItem.create({
        data: { jobId, name: dto.name, cost: dto.cost },
      }),
      this.prisma.workshopJob.update({
        where: { id: jobId },
        data: { totalCost: { increment: dto.cost } },
        select: jobSelect,
      }),
    ]);

    return updatedJob;
  }

  // ─── Update Job Status ───────────────────────────────────────────────
  async updateStatus(
    tenantId: string,
    jobId: string,
    status: WorkshopJobStatus,
  ) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id: jobId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Workshop job not found');

    return this.prisma.workshopJob.update({
      where: { id: jobId },
      data: { status },
      select: jobSelect,
    });
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const jobSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  issue: true,
  status: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, name: true, cost: true, createdAt: true },
  },
} as const;
