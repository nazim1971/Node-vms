import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EntityValidator } from '../common/helpers/entity-validator.helper';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  async create(tenantId: string, dto: CreateDriverDto) {
    // Phone and license are globally unique (gov-issued)
    await this.validator.assertPhoneUnique(dto.phone);
    await this.validator.assertLicenseUnique(dto.licenseNo);

    // If linking to a user account, validate the user belongs to the same tenant
    if (dto.userId) {
      await this.validator.assertUserExists(tenantId, dto.userId, 'User');
      await this.validator.assertUserNotAlreadyDriver(dto.userId);
    }

    // Branch must belong to this tenant
    await this.validator.assertBranchExists(tenantId, dto.branchId);

    return this.prisma.driver.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        licenseNo: dto.licenseNo,
        userId: dto.userId ?? null,
        branchId: dto.branchId ?? null,
      },
      select: driverSelect,
    });
  }

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      select: driverSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: driverSelect,
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    if (dto.phone && dto.phone !== driver.phone) {
      await this.validator.assertPhoneUnique(dto.phone, id);
    }

    if (dto.licenseNo && dto.licenseNo !== driver.licenseNo) {
      await this.validator.assertLicenseUnique(dto.licenseNo, id);
    }

    if (dto.branchId !== undefined) {
      await this.validator.assertBranchExists(tenantId, dto.branchId);
    }

    // Whitelist only safe fields — never expose tenantId or userId to update via DTO
    const data: Prisma.DriverUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.licenseNo !== undefined) data.licenseNo = dto.licenseNo;
    if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    return this.prisma.driver.update({
      where: { id },
      data,
      select: driverSelect,
    });
  }

  async remove(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

const driverSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  userId: true,
  name: true,
  phone: true,
  licenseNo: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
} as const;
