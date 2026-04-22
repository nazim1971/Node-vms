import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VehicleStatus } from '../../generated/prisma';
import type { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Start Trip ────────────────────────────────────────────────────────────
  /**
   * Only a DRIVER with an active assignment to the vehicle can start a trip.
   * userId = User.id from JWT (user.sub)
   */
  async startTrip(vehicleId: string, tenantId: string, userId: string) {
    // 1. Find the Driver record linked to this user account
    const driver = await this.prisma.driver.findFirst({
      where: { userId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) {
      throw new ForbiddenException('No driver profile found for this user');
    }

    const now = new Date();

    // 2. Verify the driver has an active assignment to this vehicle
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        vehicleId,
        driverId: driver.id,
        deletedAt: null,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to this vehicle for the current period',
      );
    }

    // 3. Check vehicle exists and is AVAILABLE
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException(
        `Vehicle is not available (current status: ${vehicle.status})`,
      );
    }

    // 4. Ensure no active trip already exists for this vehicle
    const activeTrip = await this.prisma.trip.findFirst({
      where: { vehicleId, tenantId, deletedAt: null, endTime: null },
      select: { id: true },
    });
    if (activeTrip) {
      throw new BadRequestException(
        'Vehicle already has an active trip in progress',
      );
    }

    // 5. Atomically create trip + update vehicle + update driver
    const [trip] = await this.prisma.$transaction([
      this.prisma.trip.create({
        data: { tenantId, vehicleId, driverId: driver.id, startTime: now },
        select: tripSelect,
      }),
      this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: VehicleStatus.ON_TRIP },
      }),
      this.prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: false },
      }),
    ]);

    return trip;
  }

  // ─── End Trip ──────────────────────────────────────────────────────────────
  /**
   * DRIVER can only end their own trip.
   * ADMIN/EMPLOYEE/SUPER_ADMIN can end any trip.
   */
  async endTrip(
    tripId: string,
    tenantId: string,
    userId: string,
    dto: UpdateTripDto,
    userRole: string,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, tenantId, deletedAt: null },
      select: { id: true, vehicleId: true, driverId: true, endTime: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.endTime !== null) {
      throw new BadRequestException('Trip has already ended');
    }

    // DRIVER must be the assigned driver on this trip
    if (userRole === 'DRIVER') {
      const driver = await this.prisma.driver.findFirst({
        where: { userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!driver || driver.id !== trip.driverId) {
        throw new ForbiddenException('You are not the driver for this trip');
      }
    }

    const now = new Date();

    const [updatedTrip] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: tripId },
        data: {
          endTime: now,
          ...(dto.tollCost !== undefined && { tollCost: dto.tollCost }),
          ...(dto.policeCost !== undefined && { policeCost: dto.policeCost }),
          ...(dto.income !== undefined && { income: dto.income }),
          ...(dto.distance !== undefined && { distance: dto.distance }),
        },
        select: tripSelect,
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      }),
      this.prisma.driver.update({
        where: { id: trip.driverId },
        data: { isAvailable: true },
      }),
    ]);

    return updatedTrip;
  }

  // ─── Update Trip ───────────────────────────────────────────────────────────
  async updateTrip(tripId: string, tenantId: string, dto: UpdateTripDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(dto.tollCost !== undefined && { tollCost: dto.tollCost }),
        ...(dto.policeCost !== undefined && { policeCost: dto.policeCost }),
        ...(dto.income !== undefined && { income: dto.income }),
        ...(dto.distance !== undefined && { distance: dto.distance }),
      },
      select: tripSelect,
    });
  }

  // ─── List Trips ────────────────────────────────────────────────────────────
  async listTrips(tenantId: string) {
    return this.prisma.trip.findMany({
      where: { tenantId, deletedAt: null },
      select: tripSelect,
      orderBy: { startTime: 'desc' },
    });
  }

  // ─── Get Trip ──────────────────────────────────────────────────────────────
  async getTrip(tripId: string, tenantId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, tenantId, deletedAt: null },
      select: tripSelect,
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }
}

// ─── Shared select projection ──────────────────────────────────────────────
const tripSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  driverId: true,
  startTime: true,
  endTime: true,
  distance: true,
  income: true,
  tollCost: true,
  policeCost: true,
  createdAt: true,
  updatedAt: true,
} as const;
