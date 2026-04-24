import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../generated/prisma';

const userSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already in use');

    const allowedRoles: Role[] = [Role.DRIVER, Role.EMPLOYEE];

    if (dto.role && !allowedRoles.includes(dto.role)) {
      throw new BadRequestException('Role must be DRIVER or EMPLOYEE');
    }

    const hashed = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role ?? Role.EMPLOYEE,
        branchId: dto.branchId ?? null,
        approvalStatus: 'APPROVED' as const,
        isActive: true,
      },
      select: userSelect,
    });
  }

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      select: userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.role !== undefined) data['role'] = dto.role;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.password !== undefined)
      data['password'] = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
