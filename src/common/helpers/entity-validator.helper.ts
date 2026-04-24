import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * EntityValidator — reusable validation helpers used across all services.
 *
 * Registered in SharedModule (@Global) so it is injectable everywhere
 * without re-importing.
 */
@Injectable()
export class EntityValidator {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Date Range ──────────────────────────────────────────────────────────

  /**
   * Throws BadRequestException if endDate is not after startDate.
   * Returns parsed Date objects so callers don't need to re-parse.
   */
  assertDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }
    return { start, end };
  }

  // ─── User ────────────────────────────────────────────────────────────────

  /**
   * Email must be globally unique (email is used as login identifier).
   * Exclude a specific user id when checking during updates.
   */
  async assertEmailUnique(email: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Email already in use');
  }

  /**
   * Find an active user belonging to the given tenant, or throw 404.
   */
  async assertUserExists(tenantId: string, userId: string, label = 'User') {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, role: true, isActive: true },
    });
    if (!user) throw new NotFoundException(`${label} not found`);
    return user;
  }

  // ─── Tenant ──────────────────────────────────────────────────────────────

  async assertTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found or inactive');
    return tenant;
  }

  // ─── Branch ──────────────────────────────────────────────────────────────

  /**
   * Find an active branch belonging to the tenant, or throw 404.
   * Pass null/undefined to skip the check.
   */
  async assertBranchExists(
    tenantId: string,
    branchId: string | null | undefined,
  ) {
    if (!branchId) return null;

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!branch)
      throw new NotFoundException(
        'Branch not found or does not belong to your organization',
      );
    return branch;
  }

  // ─── Vehicle ─────────────────────────────────────────────────────────────

  /**
   * Find an active vehicle belonging to the tenant, or throw 404.
   */
  async assertVehicleExists(tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
      select: { id: true, status: true, registrationNo: true },
    });
    if (!vehicle)
      throw new NotFoundException(
        'Vehicle not found or does not belong to your organization',
      );
    return vehicle;
  }

  /**
   * Registration number must be globally unique (gov-issued plates are worldwide unique).
   * Exclude a specific vehicle id when checking during updates.
   */
  async assertRegistrationUnique(
    registrationNo: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        registrationNo,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Registration number is already in use');
  }

  // ─── Driver ──────────────────────────────────────────────────────────────

  /**
   * Find an active driver belonging to the tenant, or throw 404.
   */
  async assertDriverExists(tenantId: string, driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, tenantId, deletedAt: null },
      select: { id: true, isAvailable: true, userId: true },
    });
    if (!driver)
      throw new NotFoundException(
        'Driver not found or does not belong to your organization',
      );
    return driver;
  }

  /**
   * Phone must be globally unique (mobile numbers are globally unique).
   */
  async assertPhoneUnique(phone: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.driver.findFirst({
      where: {
        phone,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Phone number is already in use');
  }

  /**
   * License number must be globally unique (gov-issued licenses are globally unique).
   */
  async assertLicenseUnique(
    licenseNo: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.driver.findFirst({
      where: {
        licenseNo,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('License number is already in use');
  }

  /**
   * Validate that a userId is not already linked to another Driver record.
   */
  async assertUserNotAlreadyDriver(
    userId: string,
    excludeDriverId?: string,
  ): Promise<void> {
    const existing = await this.prisma.driver.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(excludeDriverId && { id: { not: excludeDriverId } }),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'This user is already linked to a driver profile',
      );
  }
}
