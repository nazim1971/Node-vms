import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import { Role } from '../../generated/prisma';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const BRANCH_ID = 'branch-001';
const USER_ID = 'user-001';
const ADMIN_USER = { id: 'admin-001', role: Role.ADMIN };

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: USER_ID,
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: Role.EMPLOYEE,
  approvalStatus: 'APPROVED',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;
  let validator: jest.Mocked<EntityValidator>;

  beforeEach(async () => {
    const prismaMock = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const validatorMock = {
      assertEmailUnique: jest.fn().mockResolvedValue(undefined),
      assertBranchExists: jest.fn().mockResolvedValue({ id: BRANCH_ID, name: 'Main' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntityValidator, useValue: validatorMock },
      ],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    validator = module.get(EntityValidator) as jest.Mocked<EntityValidator>;
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123',
      role: Role.EMPLOYEE,
      branchId: BRANCH_ID,
    };

    it('creates a user with valid EMPLOYEE role', async () => {
      const created = makeUser();
      (prisma.user.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(TENANT_ID, dto);

      expect(validator.assertEmailUnique).toHaveBeenCalledWith(dto.email);
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, BRANCH_ID);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('creates a user with valid DRIVER role', async () => {
      const created = makeUser({ role: Role.DRIVER });
      (prisma.user.create as jest.Mock).mockResolvedValue(created);

      await service.create(TENANT_ID, { ...dto, role: Role.DRIVER });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('throws BadRequestException when role is ADMIN', async () => {
      await expect(
        service.create(TENANT_ID, { ...dto, role: Role.ADMIN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when role is SUPER_ADMIN', async () => {
      await expect(
        service.create(TENANT_ID, { ...dto, role: Role.SUPER_ADMIN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates ConflictException from assertEmailUnique', async () => {
      validator.assertEmailUnique.mockRejectedValue(new Error('Email taken'));
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow('Email taken');
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns users for the tenant', async () => {
      const users = [makeUser(), makeUser({ id: 'user-002' })];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.findAll(TENANT_ID);
      expect(result).toHaveLength(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('passes branchId filter when provided', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      await service.findAll(TENANT_ID, BRANCH_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branchId: BRANCH_ID }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a user when found', async () => {
      const user = makeUser();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);

      const result = await service.findOne(TENANT_ID, USER_ID);
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(TENANT_ID, 'missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates name successfully', async () => {
      const target = makeUser();
      const updated = makeUser({ name: 'Jane Smith' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, USER_ID, { name: 'Jane Smith' }, ADMIN_USER);
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when target user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update(TENANT_ID, 'missing', { name: 'X' }, ADMIN_USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when trying to update an ADMIN account', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ role: Role.ADMIN }));
      await expect(
        service.update(TENANT_ID, USER_ID, { name: 'Hack' }, ADMIN_USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to change own role', async () => {
      const selfId = ADMIN_USER.id;
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ id: selfId, role: Role.EMPLOYEE }));
      await expect(
        service.update(TENANT_ID, selfId, { role: Role.DRIVER }, { id: selfId, role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to deactivate own account', async () => {
      const selfId = ADMIN_USER.id;
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ id: selfId, role: Role.EMPLOYEE }));
      await expect(
        service.update(TENANT_ID, selfId, { isActive: false }, { id: selfId, role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when no updatable fields provided', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser());
      await expect(
        service.update(TENANT_ID, USER_ID, {}, ADMIN_USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates branch when branchId is provided', async () => {
      const target = makeUser();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target);
      (prisma.user.update as jest.Mock).mockResolvedValue(target);

      await service.update(TENANT_ID, USER_ID, { branchId: 'branch-002' }, ADMIN_USER);
      expect(validator.assertBranchExists).toHaveBeenCalledWith(TENANT_ID, 'branch-002');
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-deletes a DRIVER/EMPLOYEE successfully', async () => {
      const target = makeUser({ role: Role.DRIVER });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target);
      (prisma.user.update as jest.Mock).mockResolvedValue(target);

      await service.remove(TENANT_ID, USER_ID, ADMIN_USER);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(TENANT_ID, 'missing', ADMIN_USER)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when deleting own account', async () => {
      const selfId = 'self-123';
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ id: selfId, role: Role.EMPLOYEE }));
      await expect(
        service.remove(TENANT_ID, selfId, { id: selfId, role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to delete an ADMIN account', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ role: Role.ADMIN }));
      await expect(service.remove(TENANT_ID, USER_ID, ADMIN_USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to delete a SUPER_ADMIN account', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ role: Role.SUPER_ADMIN }));
      await expect(service.remove(TENANT_ID, USER_ID, ADMIN_USER)).rejects.toThrow(ForbiddenException);
    });
  });
});
