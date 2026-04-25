import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Role } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';

const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  isActive: true,
  createdAt: true,
  tenant: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AdminApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all ADMIN users with optional status filter.
   * Used by SUPER_ADMIN to review applications.
   */
  async findAll(status?: string) {
    return this.prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        deletedAt: null,
        ...(status && { approvalStatus: status as ApprovalStatus }),
      },
      select: adminSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve an admin application:
   * - Sets approvalStatus = APPROVED
   * - Sets isActive = true on the user
   * - Sets isActive = true on the tenant
   */
  async approve(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.ADMIN, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Admin application not found');

    if (user.approvalStatus === ApprovalStatus.APPROVED) {
      throw new BadRequestException('Application is already approved');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          isActive: true,
        },
        select: adminSelect,
      }),
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { isActive: true },
      }),
    ]);

    return updatedUser;
  }

  /**
   * Reject an admin application:
   * - Sets approvalStatus = REJECTED
   * - Keeps isActive = false
   */
  async reject(userId: string, reason?: string) {
    // Placeholder for future audit/comment storage.
    void reason;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.ADMIN, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Admin application not found');

    if (user.approvalStatus === ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot reject an already approved account',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        isActive: false,
      },
      select: adminSelect,
    });
  }

  /**
   * Suspend an active admin (emergency override by SUPER_ADMIN).
   * Sets approvalStatus = SUSPENDED, isActive = false.
   * Also deactivates the tenant.
   */
  async suspend(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.ADMIN, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Admin not found');

    if (user.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Only approved admins can be suspended');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: ApprovalStatus.SUSPENDED,
          isActive: false,
        },
        select: adminSelect,
      }),
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { isActive: false },
      }),
    ]);

    return updatedUser;
  }

  /**
   * Re-activate a suspended admin.
   */
  async reactivate(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.ADMIN, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Admin not found');

    if (user.approvalStatus !== ApprovalStatus.SUSPENDED) {
      throw new BadRequestException('Only suspended admins can be reactivated');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          isActive: true,
        },
        select: adminSelect,
      }),
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { isActive: true },
      }),
    ]);

    return updatedUser;
  }
}
