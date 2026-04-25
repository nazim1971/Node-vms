import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import { VehicleStatus, VehicleSourceType } from '../../generated/prisma';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const BRANCH_ID = 'branch-001';
const VEHICLE_ID = 'vehicle-001';

const makeVehicle = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: VEHICLE_ID,
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  registrationNo: 'ABC-1234',
  model: 'Hilux',
  seatCount: 5,
  status: VehicleStatus.AVAILABLE,
  sourceType: VehicleSourceType.OWNED,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  branch: { id: BRANCH_ID, name: 'Main Branch' },
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: jest.Mocked<PrismaService>;
  let validator: jest.Mocked<EntityValidator>;

  beforeEach(async () => {
    const prismaMock = {
      vehicle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const validatorMock = {
      assertRegistrationUnique: jest.fn().mockResolvedValue(undefined),
      assertBranchExists: jest.fn().mockResolvedValue({ id: BRANCH_ID, name: 'Main' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntityValidator, useValue: validatorMock },
      ],
    }).compile();

    service = module.get(VehiclesService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    validator = module.get(EntityValidator) as jest.Mocked<EntityValidator>;
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = {
      registrationNo: 'ABC-1234',
      model: 'Hilux',
      seatCount: 5,
      branchId: BRANCH_ID,
    };

    it('creates a vehicle with valid data', async () => {
      const created = makeVehicle();
      (prisma.vehicle.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(TENANT_ID, dto);

      expect(validator.assertRegistrationUnique).toHaveBeenCalledWith(dto.registrationNo);
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, BRANCH_ID);
      expect(prisma.vehicle.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('defaults sourceType to OWNED when not provided', async () => {
      (prisma.vehicle.create as jest.Mock).mockResolvedValue(makeVehicle());
      await service.create(TENANT_ID, dto);

      const callArgs = (prisma.vehicle.create as jest.Mock).mock.calls[0][0] as {
        data: { sourceType: VehicleSourceType };
      };
      expect(callArgs.data.sourceType).toBe(VehicleSourceType.OWNED);
    });

    it('defaults status to AVAILABLE on creation', async () => {
      (prisma.vehicle.create as jest.Mock).mockResolvedValue(makeVehicle());
      await service.create(TENANT_ID, dto);

      const callArgs = (prisma.vehicle.create as jest.Mock).mock.calls[0][0] as {
        data: { status: VehicleStatus };
      };
      expect(callArgs.data.status).toBe(VehicleStatus.AVAILABLE);
    });

    it('propagates ConflictException when registration number is taken', async () => {
      validator.assertRegistrationUnique.mockRejectedValue(new Error('Reg taken'));
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow('Reg taken');
    });

    it('propagates NotFoundException when branch not found', async () => {
      validator.assertBranchExists.mockRejectedValue(new NotFoundException('Branch not found'));
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all vehicles for the tenant', async () => {
      const vehicles = [makeVehicle(), makeVehicle({ id: 'vehicle-002' })];
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue(vehicles);

      const result = await service.findAll(TENANT_ID);
      expect(result).toHaveLength(2);
    });

    it('passes status filter when provided', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, 'AVAILABLE');

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'AVAILABLE' }),
        }),
      );
    });

    it('passes branchId filter when provided', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, undefined, BRANCH_ID);

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branchId: BRANCH_ID }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a vehicle when found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(makeVehicle());
      const result = await service.findOne(TENANT_ID, VEHICLE_ID);
      expect(result.id).toBe(VEHICLE_ID);
    });

    it('throws NotFoundException when vehicle does not exist', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates model successfully', async () => {
      const existing = makeVehicle();
      const updated = makeVehicle({ model: 'LandCruiser' });
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, VEHICLE_ID, { model: 'LandCruiser' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'missing', { model: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('validates new registration uniqueness when registrationNo changes', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(makeVehicle({ registrationNo: 'OLD-001' }));
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(makeVehicle());

      await service.update(TENANT_ID, VEHICLE_ID, { registrationNo: 'NEW-001' });
      expect(validator.assertRegistrationUnique).toHaveBeenCalledWith('NEW-001', VEHICLE_ID);
    });

    it('skips registration validation when registrationNo is unchanged', async () => {
      const existing = makeVehicle({ registrationNo: 'ABC-1234' });
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(existing);

      await service.update(TENANT_ID, VEHICLE_ID, { registrationNo: 'ABC-1234' });
      expect(validator.assertRegistrationUnique).not.toHaveBeenCalled();
    });

    it('validates branch when branchId is provided', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(makeVehicle());
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(makeVehicle());

      await service.update(TENANT_ID, VEHICLE_ID, { branchId: 'branch-002' });
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, 'branch-002');
    });

    it('throws BadRequestException when no updatable fields provided', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(makeVehicle());
      await expect(service.update(TENANT_ID, VEHICLE_ID, {})).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-deletes a vehicle successfully', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(makeVehicle());
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(makeVehicle());

      await service.remove(TENANT_ID, VEHICLE_ID);
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws NotFoundException when vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
