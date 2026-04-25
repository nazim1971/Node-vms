import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const BRANCH_ID = 'branch-001';
const DRIVER_ID = 'driver-001';
const USER_ID = 'user-001';

const makeDriver = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: DRIVER_ID,
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  userId: null,
  name: 'Mike Johnson',
  phone: '+1-555-0200',
  licenseNo: 'DL-2023-001',
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  branch: { id: BRANCH_ID, name: 'Main Branch' },
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('DriversService', () => {
  let service: DriversService;
  let prisma: jest.Mocked<PrismaService>;
  let validator: jest.Mocked<EntityValidator>;

  beforeEach(async () => {
    const prismaMock = {
      driver: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const validatorMock = {
      assertPhoneUnique: jest.fn().mockResolvedValue(undefined),
      assertLicenseUnique: jest.fn().mockResolvedValue(undefined),
      assertUserExists: jest.fn().mockResolvedValue({ id: USER_ID, role: 'DRIVER', isActive: true }),
      assertUserNotAlreadyDriver: jest.fn().mockResolvedValue(undefined),
      assertBranchExists: jest.fn().mockResolvedValue({ id: BRANCH_ID, name: 'Main' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntityValidator, useValue: validatorMock },
      ],
    }).compile();

    service = module.get(DriversService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    validator = module.get(EntityValidator) as jest.Mocked<EntityValidator>;
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = {
      name: 'Mike Johnson',
      phone: '+1-555-0200',
      licenseNo: 'DL-2023-001',
      branchId: BRANCH_ID,
    };

    it('creates a driver with valid data', async () => {
      const created = makeDriver();
      (prisma.driver.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(TENANT_ID, dto);

      expect(validator.assertPhoneUnique).toHaveBeenCalledWith(dto.phone);
      expect(validator.assertLicenseUnique).toHaveBeenCalledWith(dto.licenseNo);
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, BRANCH_ID);
      expect(result).toEqual(created);
    });

    it('validates userId when linking to a user account', async () => {
      const created = makeDriver({ userId: USER_ID });
      (prisma.driver.create as jest.Mock).mockResolvedValue(created);

      await service.create(TENANT_ID, { ...dto, userId: USER_ID });

      expect(validator.assertUserExists).toHaveBeenCalledWith(TENANT_ID, USER_ID, 'User');
      expect(validator.assertUserNotAlreadyDriver).toHaveBeenCalledWith(USER_ID);
    });

    it('skips user validation when userId is not provided', async () => {
      (prisma.driver.create as jest.Mock).mockResolvedValue(makeDriver());

      await service.create(TENANT_ID, dto);
      expect(validator.assertUserExists).not.toHaveBeenCalled();
      expect(validator.assertUserNotAlreadyDriver).not.toHaveBeenCalled();
    });

    it('propagates ConflictException when phone is already taken', async () => {
      validator.assertPhoneUnique.mockRejectedValue(new Error('Phone taken'));
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow('Phone taken');
    });

    it('propagates ConflictException when license is already taken', async () => {
      validator.assertLicenseUnique.mockRejectedValue(new Error('License taken'));
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow('License taken');
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all drivers for a tenant', async () => {
      const drivers = [makeDriver(), makeDriver({ id: 'driver-002' })];
      (prisma.driver.findMany as jest.Mock).mockResolvedValue(drivers);

      const result = await service.findAll(TENANT_ID);
      expect(result).toHaveLength(2);
    });

    it('passes branchId filter when provided', async () => {
      (prisma.driver.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, BRANCH_ID);

      expect(prisma.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branchId: BRANCH_ID }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a driver when found', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(makeDriver());
      const result = await service.findOne(TENANT_ID, DRIVER_ID);
      expect(result.id).toBe(DRIVER_ID);
    });

    it('throws NotFoundException when driver does not exist', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates driver name successfully', async () => {
      const existing = makeDriver();
      const updated = makeDriver({ name: 'New Name' });
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.driver.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, DRIVER_ID, { name: 'New Name' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when driver not found', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('validates new phone uniqueness when phone changes', async () => {
      const existing = makeDriver({ phone: '+1-555-OLD' });
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.driver.update as jest.Mock).mockResolvedValue(makeDriver());

      await service.update(TENANT_ID, DRIVER_ID, { phone: '+1-555-NEW' });
      expect(validator.assertPhoneUnique).toHaveBeenCalledWith('+1-555-NEW', DRIVER_ID);
    });

    it('skips phone validation when phone is unchanged', async () => {
      const existing = makeDriver({ phone: '+1-555-0200' });
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.driver.update as jest.Mock).mockResolvedValue(existing);

      await service.update(TENANT_ID, DRIVER_ID, { phone: '+1-555-0200' });
      expect(validator.assertPhoneUnique).not.toHaveBeenCalled();
    });

    it('validates branch when branchId is provided', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(makeDriver());
      (prisma.driver.update as jest.Mock).mockResolvedValue(makeDriver());

      await service.update(TENANT_ID, DRIVER_ID, { branchId: 'branch-002' });
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, 'branch-002');
    });

    it('throws BadRequestException when no updatable fields provided', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(makeDriver());
      await expect(service.update(TENANT_ID, DRIVER_ID, {})).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-deletes a driver successfully', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(makeDriver());
      (prisma.driver.update as jest.Mock).mockResolvedValue(makeDriver());

      await service.remove(TENANT_ID, DRIVER_ID);
      expect(prisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws NotFoundException when driver not found', async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
