import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAssignmentDto) {
    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;

    if (end && end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const driver = await this.prisma.driver.findFirst({
      where: { id: dto.driverId, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    // Check for overlapping active assignment for this vehicle
    const overlap = await this.prisma.assignment.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        deletedAt: null,
        startDate: end ? { lte: end } : undefined,
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
    });
    if (overlap) {
      throw new BadRequestException('Vehicle already has an overlapping assignment in this period');
    }

    return this.prisma.assignment.create({
      data: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        startDate: start,
        endDate: end,
      },
    });
  }

  async findAll(tenantId: string, vehicleId?: string, driverId?: string) {
    return this.prisma.assignment.findMany({
      where: {
        deletedAt: null,
        vehicle: { tenantId },
        ...(vehicleId && { vehicleId }),
        ...(driverId && { driverId }),
      },
      include: {
        vehicle: { select: { id: true, registrationNo: true, model: true } },
        driver: { select: { id: true, name: true, licenseNo: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, deletedAt: null, vehicle: { tenantId } },
      include: {
        vehicle: { select: { id: true, registrationNo: true, model: true } },
        driver: { select: { id: true, name: true, licenseNo: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async update(tenantId: string, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, deletedAt: null, vehicle: { tenantId } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const start = dto.startDate ? new Date(dto.startDate) : assignment.startDate;
    const end = dto.endDate !== undefined
      ? (dto.endDate ? new Date(dto.endDate) : null)
      : assignment.endDate;

    if (end && end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.vehicleId && { vehicleId: dto.vehicleId }),
        ...(dto.driverId && { driverId: dto.driverId }),
        ...(dto.startDate && { startDate: start }),
        ...(dto.endDate !== undefined && { endDate: end }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, deletedAt: null, vehicle: { tenantId } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.prisma.assignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
