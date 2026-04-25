/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../database/prisma.service';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const VEHICLE_ID = 'vehicle-001';
const DRIVER_ID = 'driver-001';
const ASSIGNMENT_ID = 'assignment-001';

const makeAssignment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: ASSIGNMENT_ID,
  vehicleId: VEHICLE_ID,
  driverId: DRIVER_ID,
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-05-31'),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      vehicle: { findFirst: jest.fn() },
      driver: { findFirst: jest.fn() },
      assignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(AssignmentsService);
    prisma = module.get(PrismaService);
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = {
      vehicleId: VEHICLE_ID,
      driverId: DRIVER_ID,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    };

    beforeEach(() => {
      // Default happy path mocks
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({
        id: VEHICLE_ID,
      });
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue({
        id: DRIVER_ID,
      });
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(null); // no overlaps
      (prisma.assignment.create as jest.Mock).mockResolvedValue(
        makeAssignment(),
      );
    });

    it('creates an assignment for a valid vehicle and driver', async () => {
      const result = await service.create(TENANT_ID, dto);
      expect(prisma.assignment.create).toHaveBeenCalled();
      expect(result.vehicleId).toBe(VEHICLE_ID);
    });

    it('throws BadRequestException when endDate is before startDate', async () => {
      await expect(
        service.create(TENANT_ID, {
          ...dto,
          startDate: '2026-05-31',
          endDate: '2026-05-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when endDate equals startDate', async () => {
      await expect(
        service.create(TENANT_ID, {
          ...dto,
          startDate: '2026-05-01',
          endDate: '2026-05-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when vehicle does not belong to tenant', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when driver does not belong to tenant', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when vehicle has overlapping assignment', async () => {
      (prisma.assignment.findFirst as jest.Mock)
        .mockResolvedValueOnce(makeAssignment()) // vehicle overlap check returns a hit
        .mockResolvedValue(null);

      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(TENANT_ID, dto)).resolves.toBeDefined(); // only vehicle check throws
    });

    it('throws BadRequestException when driver has overlapping assignment', async () => {
      (prisma.assignment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // vehicle overlap — no conflict
        .mockResolvedValue(makeAssignment()); // driver overlap — conflict

      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates assignment without endDate (open-ended)', async () => {
      (prisma.assignment.create as jest.Mock).mockResolvedValue(
        makeAssignment({ endDate: null }),
      );

      const result = await service.create(TENANT_ID, {
        ...dto,
        endDate: undefined,
      });
      expect(prisma.assignment.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all assignments for the tenant', async () => {
      const assignments = [makeAssignment(), makeAssignment({ id: 'a-002' })];
      (prisma.assignment.findMany as jest.Mock).mockResolvedValue(assignments);

      const result = await service.findAll(TENANT_ID);
      expect(result).toHaveLength(2);
    });

    it('filters by vehicleId when provided', async () => {
      (prisma.assignment.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, VEHICLE_ID);

      expect(prisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vehicleId: VEHICLE_ID }),
        }),
      );
    });

    it('filters by driverId when provided', async () => {
      (prisma.assignment.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, undefined, DRIVER_ID);

      expect(prisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ driverId: DRIVER_ID }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns an assignment when found', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(
        makeAssignment(),
      );
      const result = await service.findOne(TENANT_ID, ASSIGNMENT_ID);
      expect(result.id).toBe(ASSIGNMENT_ID);
    });

    it('throws NotFoundException when assignment does not exist', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(TENANT_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates endDate successfully', async () => {
      const existing = makeAssignment();
      const updated = makeAssignment({ endDate: new Date('2026-06-30') });
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.assignment.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, ASSIGNMENT_ID, {
        endDate: '2026-06-30',
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when assignment not found', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when updated dates are invalid', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(
        makeAssignment(),
      );
      await expect(
        service.update(TENANT_ID, ASSIGNMENT_ID, {
          startDate: '2026-06-01',
          endDate: '2026-05-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('re-validates vehicle tenant ownership when vehicleId changes', async () => {
      const existing = makeAssignment({ vehicleId: VEHICLE_ID });
      (prisma.assignment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing) // find assignment
        .mockResolvedValue(null); // new vehicle not found

      await expect(
        service.update(TENANT_ID, ASSIGNMENT_ID, {
          vehicleId: 'other-vehicle',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('re-validates driver tenant ownership when driverId changes', async () => {
      const existing = makeAssignment({ driverId: DRIVER_ID });
      (prisma.assignment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing) // find assignment
        .mockResolvedValue(null); // new driver not found

      await expect(
        service.update(TENANT_ID, ASSIGNMENT_ID, { driverId: 'other-driver' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-deletes an assignment successfully', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(
        makeAssignment(),
      );
      (prisma.assignment.update as jest.Mock).mockResolvedValue(
        makeAssignment(),
      );

      await service.remove(TENANT_ID, ASSIGNMENT_ID);
      expect(prisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws NotFoundException when assignment not found', async () => {
      (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(TENANT_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
