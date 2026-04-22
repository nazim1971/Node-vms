import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { BookingStatus } from '../../generated/prisma';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AssignDriverVehicleDto } from './dto/assign-driver-vehicle.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  // ─── Create (PENDING) ────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // Vehicle availability check
    const vehicleCheck = await this.scheduling.checkVehicleAvailability(
      dto.vehicleId,
      tenantId,
      start,
      end,
    );
    if (!vehicleCheck.available) {
      throw new BadRequestException({
        message: 'Vehicle is not available for the requested period',
        reasons: vehicleCheck.reasons,
      });
    }

    // Driver availability check (if driver provided)
    if (dto.driverId) {
      const driverCheck = await this.scheduling.checkDriverAvailability(
        dto.driverId,
        tenantId,
        start,
        end,
      );
      if (!driverCheck.available) {
        throw new BadRequestException({
          message: 'Driver is not available for the requested period',
          reasons: driverCheck.reasons,
        });
      }
    }

    return this.prisma.booking.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId ?? null,
        startDate: start,
        endDate: end,
        status: BookingStatus.PENDING,
        customerName: dto.customerName,
        contact: dto.contact,
        advancePaid: dto.advancePaid ?? 0,
      },
      select: bookingSelect,
    });
  }

  // ─── List all (tenant-scoped) ────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.booking.findMany({
      where: { tenantId, deletedAt: null },
      select: bookingSelect,
      orderBy: { startDate: 'asc' },
    });
  }

  // ─── Get one ─────────────────────────────────────────────────────────────────

  async findOne(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: bookingSelect,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─── Confirm ─────────────────────────────────────────────────────────────────

  async confirm(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm a booking with status: ${booking.status}`,
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
      select: bookingSelect,
    });
  }

  // ─── Cancel ──────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      select: bookingSelect,
    });
  }

  // ─── Assign driver + vehicle ──────────────────────────────────────────────────

  async assign(tenantId: string, id: string, dto: AssignDriverVehicleDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new ForbiddenException(
        `Cannot assign to a booking with status: ${booking.status}`,
      );
    }

    const start = booking.startDate;
    const end = booking.endDate;

    // Re-check vehicle availability if changing vehicle
    if (dto.vehicleId && dto.vehicleId !== booking.vehicleId) {
      const vehicleCheck = await this.scheduling.checkVehicleAvailability(
        dto.vehicleId,
        tenantId,
        start,
        end,
      );
      if (!vehicleCheck.available) {
        throw new BadRequestException({
          message: 'Vehicle is not available for the booking period',
          reasons: vehicleCheck.reasons,
        });
      }
    }

    // Re-check driver availability if changing driver
    if (dto.driverId && dto.driverId !== booking.driverId) {
      const driverCheck = await this.scheduling.checkDriverAvailability(
        dto.driverId,
        tenantId,
        start,
        end,
      );
      if (!driverCheck.available) {
        throw new BadRequestException({
          message: 'Driver is not available for the booking period',
          reasons: driverCheck.reasons,
        });
      }
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.vehicleId !== undefined && { vehicleId: dto.vehicleId }),
        ...(dto.driverId !== undefined && { driverId: dto.driverId }),
        ...(dto.advancePaid !== undefined && { advancePaid: dto.advancePaid }),
      },
      select: bookingSelect,
    });
  }
}

// ─── Shared select projection ────────────────────────────────────────────────

const bookingSelect = {
  id: true,
  tenantId: true,
  vehicleId: true,
  driverId: true,
  startDate: true,
  endDate: true,
  status: true,
  advancePaid: true,
  customerName: true,
  contact: true,
  createdAt: true,
  updatedAt: true,
} as const;
