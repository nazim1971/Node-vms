import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, Prisma } from '../../generated/prisma';

// Fields returned for every user response — password is never exposed
const userSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
  userBranches: {
    select: {
      branch: { select: { id: true, name: true } },
    },
  },
} as const;

// Only DRIVER and EMPLOYEE can be created/managed by an ADMIN
const MANAGEABLE_ROLES: Role[] = [Role.DRIVER, Role.EMPLOYEE];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private assertManageableRole(role?: Role): void {
    if (role && !MANAGEABLE_ROLES.includes(role)) {
      throw new BadRequestException(
        `You can only create users with role DRIVER or EMPLOYEE`,
      );
    }
  }

  private async findActiveUser(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private normalizeBranchIds(branchIds?: string[]): string[] {
    if (!branchIds) return [];
    return [...new Set(branchIds.filter((id) => id && id.trim().length > 0))];
  }

  private async assertBranchesExist(
    tenantId: string,
    branchIds: string[],
  ): Promise<void> {
    if (branchIds.length === 0) return;

    const count = await this.prisma.branch.count({
      where: { tenantId, deletedAt: null, id: { in: branchIds } },
    });

    if (count !== branchIds.length) {
      throw new BadRequestException('One or more branches are invalid');
    }
  }

  // ─── CREATE ─────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateUserDto) {
    // Role guard — ADMIN cannot create another ADMIN or SUPER_ADMIN
    this.assertManageableRole(dto.role);

    // Email is globally unique (used as login identifier across all tenants)
    await this.validator.assertEmailUnique(dto.email);

    // Branch must belong to this tenant
    await this.validator.assertBranchExists(tenantId, dto.branchId);

    const branchIds = this.normalizeBranchIds([
      ...(dto.branchIds ?? []),
      ...(dto.branchId ? [dto.branchId] : []),
    ]);
    await this.assertBranchesExist(tenantId, branchIds);

    const primaryBranchId = dto.branchId ?? branchIds[0] ?? null;

    const hashedPassword = await this.hashPassword(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: dto.role ?? Role.EMPLOYEE,
          branchId: primaryBranchId,
          approvalStatus: 'APPROVED',
          isActive: true,
        },
        select: { id: true },
      });

      if (branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: branchIds.map((branchId) => ({
            tenantId,
            userId: user.id,
            branchId,
          })),
        });
      }

      return user;
    });

    return this.prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: userSelect,
    });
  }

  // ─── READ ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        // ADMIN sees only DRIVER/EMPLOYEE — ADMINs managed via /admin-applications
        role: { in: MANAGEABLE_ROLES },
        ...(branchId && {
          OR: [
            { branchId },
            { userBranches: { some: { branchId, tenantId } } },
          ],
        }),
      },
      select: userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null, role: { in: MANAGEABLE_ROLES } },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── UPDATE ─────────────────────────────────────────────────────────────────

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
    currentUser: { id: string; role: Role },
  ) {
    const target = await this.findActiveUser(tenantId, id);

    // ADMIN cannot modify another ADMIN or SUPER_ADMIN
    if (!MANAGEABLE_ROLES.includes(target.role)) {
      throw new ForbiddenException(
        'You can only update DRIVER or EMPLOYEE accounts',
      );
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.role !== undefined) {
      this.assertManageableRole(dto.role);
      if (currentUser.id === id) {
        throw new ForbiddenException('You cannot change your own role');
      }
      data.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      if (currentUser.id === id && dto.isActive === false) {
        throw new ForbiddenException('You cannot deactivate your own account');
      }
      data.isActive = dto.isActive;
    }

    if (dto.branchId !== undefined) {
      await this.validator.assertBranchExists(tenantId, dto.branchId);
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    }

    if (dto.password !== undefined) {
      data.password = await this.hashPassword(dto.password);
    }

    const incomingBranchIds =
      dto.branchIds !== undefined
        ? this.normalizeBranchIds([
            ...dto.branchIds,
            ...(dto.branchId ? [dto.branchId] : []),
          ])
        : undefined;

    if (incomingBranchIds !== undefined) {
      await this.assertBranchesExist(tenantId, incomingBranchIds);

      if (dto.branchId === undefined) {
        data.branch = incomingBranchIds[0]
          ? { connect: { id: incomingBranchIds[0] } }
          : { disconnect: true };
      }
    }

    const hasUserUpdates = Object.keys(data).length > 0;

    if (!hasUserUpdates && incomingBranchIds === undefined) {
      throw new BadRequestException('No updatable fields provided');
    }

    await this.prisma.$transaction(async (tx) => {
      if (hasUserUpdates) {
        await tx.user.update({ where: { id }, data });
      }

      if (incomingBranchIds !== undefined) {
        await tx.userBranch.deleteMany({ where: { tenantId, userId: id } });

        if (incomingBranchIds.length > 0) {
          await tx.userBranch.createMany({
            data: incomingBranchIds.map((branchId) => ({
              tenantId,
              userId: id,
              branchId,
            })),
          });
        }
      }
    });

    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: userSelect,
    });
  }

  // ─── RESET SUBORDINATE PASSWORD ─────────────────────────────────────────────

  /**
   * ADMIN: resets a DRIVER or EMPLOYEE password without requiring current password.
   * SUPER_ADMIN: can reset ADMIN password (enforced at the controller via role guard;
   *              the same service method is reused via AdminApplicationsService).
   */
  async resetSubordinatePassword(
    tenantId: string,
    targetId: string,
    newPassword: string,
    requesterRole: Role,
  ) {
    const target = await this.findActiveUser(tenantId, targetId);

    // ADMIN may only reset DRIVER / EMPLOYEE passwords
    if (
      requesterRole === Role.ADMIN &&
      !MANAGEABLE_ROLES.includes(target.role)
    ) {
      throw new ForbiddenException(
        'You can only reset passwords for DRIVER or EMPLOYEE accounts',
      );
    }

    const hashed = await this.hashPassword(newPassword);

    return this.prisma.user.update({
      where: { id: targetId },
      data: { password: hashed },
      select: userSelect,
    });
  }

  // ─── DELETE (SOFT) ──────────────────────────────────────────────────────────

  async remove(
    tenantId: string,
    id: string,
    currentUser: { id: string; role: Role },
  ) {
    const target = await this.findActiveUser(tenantId, id);

    // Cannot delete yourself
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // ADMIN can only delete DRIVER or EMPLOYEE — not other ADMINs or SUPER_ADMIN
    if (!MANAGEABLE_ROLES.includes(target.role)) {
      throw new ForbiddenException(
        'You can only delete DRIVER or EMPLOYEE accounts',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
