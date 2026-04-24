import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateIncomeDto) {
    return this.prisma.income.create({
      data: {
        tenantId,
        source: dto.source,
        amount: dto.amount,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.income.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const income = await this.prisma.income.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!income) throw new NotFoundException('Income record not found');
    return income;
  }

  async update(tenantId: string, id: string, dto: UpdateIncomeDto) {
    const income = await this.prisma.income.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!income) throw new NotFoundException('Income record not found');

    return this.prisma.income.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const income = await this.prisma.income.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!income) throw new NotFoundException('Income record not found');

    await this.prisma.income.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
