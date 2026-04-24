import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBranchDto) {
    // Prevent duplicate branch names within the same tenant
    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        `A branch named "${dto.name}" already exists for your organization`,
      );
    }

    return this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  /**
   * List all branches for a tenant, each with:
   * - user count
   * - vehicle count
   * - driver count
   */
  async findAll(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, vehicles: true, drivers: true },
        },
      },
    });
    return branches;
  }

  /**
   * Single branch with full details — users, vehicles, active bookings.
   */
  async findOne(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        vehicles: {
          where: { deletedAt: null },
          select: { id: true, registrationNo: true, model: true, status: true },
        },
        drivers: {
          where: { deletedAt: null },
          select: { id: true, name: true, phone: true, isAvailable: true },
        },
        _count: {
          select: {
            users: true,
            vehicles: true,
            drivers: true,
            bookings: true,
            workshopJobs: true,
          },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  /**
   * Aggregate cross-branch summary for the admin dashboard.
   * Returns per-branch stats in a single response.
   */
  async getAggregateSummary(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            vehicles: true,
            drivers: true,
            bookings: true,
            workshopJobs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Totals across all branches
    const totals = {
      branches: branches.length,
      users: branches.reduce((s, b) => s + b._count.users, 0),
      vehicles: branches.reduce((s, b) => s + b._count.vehicles, 0),
      drivers: branches.reduce((s, b) => s + b._count.drivers, 0),
      bookings: branches.reduce((s, b) => s + b._count.bookings, 0),
      workshopJobs: branches.reduce((s, b) => s + b._count.workshopJobs, 0),
    };

    return { totals, branches };
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    if (dto.name && dto.name !== branch.name) {
      const dup = await this.prisma.branch.findFirst({
        where: { tenantId, name: dto.name, deletedAt: null, id: { not: id } },
      });
      if (dup) {
        throw new ConflictException(
          `A branch named "${dto.name}" already exists for your organization`,
        );
      }
    }

    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // Soft delete — unlink resources from branch first to avoid orphans
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      }),
      this.prisma.vehicle.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      }),
      this.prisma.driver.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      }),
      this.prisma.branch.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }
}
