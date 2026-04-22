import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BookingStatus } from '../../generated/prisma';

export interface AvailabilityResult {
  available: boolean;
  reasons: string[];
}

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a vehicle is available for a given date range.
   *
   * Unavailable if any of:
   * 1. Active booking (PENDING/CONFIRMED) overlaps the range
   * 2. An active trip overlaps the range
   * 3. A maintenance log is scheduled within the range, or vehicle is currently IN MAINTENANCE status
   */
  async checkVehicleAvailability(
    vehicleId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilityResult> {
    const reasons: string[] = [];

    // 1. Booking conflict — PENDING or CONFIRMED bookings that overlap [startDate, endDate)
    const bookingConflict = await this.prisma.booking.findFirst({
      where: {
        vehicleId,
        tenantId,
        deletedAt: null,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    });
    if (bookingConflict) {
      reasons.push(
        `Vehicle has a conflicting booking from ${bookingConflict.startDate.toISOString()} to ${bookingConflict.endDate.toISOString()}`,
      );
    }

    // 2. Trip conflict — active or overlapping trip
    const tripConflict = await this.prisma.trip.findFirst({
      where: {
        vehicleId,
        tenantId,
        deletedAt: null,
        startTime: { lt: endDate },
        OR: [
          { endTime: null }, // trip is currently active (no end)
          { endTime: { gt: startDate } }, // trip overlaps range
        ],
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (tripConflict) {
      reasons.push(
        tripConflict.endTime
          ? `Vehicle has an active trip from ${tripConflict.startTime.toISOString()}`
          : `Vehicle has a trip overlapping the requested period`,
      );
    }

    // 3. Maintenance conflict — maintenance log date falls within range OR vehicle status = MAINTENANCE
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { status: true },
    });

    if (vehicle?.status === 'MAINTENANCE') {
      reasons.push('Vehicle is currently under maintenance');
    } else {
      const maintenanceConflict = await this.prisma.maintenanceLog.findFirst({
        where: {
          vehicleId,
          tenantId,
          deletedAt: null,
          date: { gte: startDate, lte: endDate },
        },
        select: { id: true, date: true },
      });
      if (maintenanceConflict) {
        reasons.push(
          `Vehicle has maintenance scheduled on ${maintenanceConflict.date.toISOString()}`,
        );
      }
    }

    return { available: reasons.length === 0, reasons };
  }

  /**
   * Check if a driver is available for a given date range.
   *
   * Unavailable if any of:
   * 1. Driver has an active assignment overlapping the range
   * 2. Driver has an active trip overlapping the range
   */
  async checkDriverAvailability(
    driverId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilityResult> {
    const reasons: string[] = [];

    // 1. Assignment conflict — overlapping assignment
    const assignmentConflict = await this.prisma.assignment.findFirst({
      where: {
        driverId,
        deletedAt: null,
        startDate: { lt: endDate },
        OR: [
          { endDate: null }, // assignment is open-ended (still active)
          { endDate: { gt: startDate } }, // assignment overlaps range
        ],
      },
      select: { id: true, startDate: true, endDate: true },
    });
    if (assignmentConflict) {
      reasons.push(
        assignmentConflict.endDate
          ? `Driver is assigned to a vehicle until ${assignmentConflict.endDate.toISOString()}`
          : 'Driver is currently assigned to a vehicle with no end date',
      );
    }

    // 2. Trip conflict — active or overlapping trip
    const tripConflict = await this.prisma.trip.findFirst({
      where: {
        driverId,
        tenantId,
        deletedAt: null,
        startTime: { lt: endDate },
        OR: [{ endTime: null }, { endTime: { gt: startDate } }],
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (tripConflict) {
      reasons.push(
        tripConflict.endTime
          ? `Driver has a trip overlapping the requested period`
          : `Driver is currently on an active trip`,
      );
    }

    return { available: reasons.length === 0, reasons };
  }
}
