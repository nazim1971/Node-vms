import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, EXPENSE_TYPES } from './dto/create-expense.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('expenses')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * POST /expenses
   * Create an expense record. type must be: FUEL | MAINTENANCE | DRIVER | OTHER
   */
  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: JwtPayload) {
    return this.expensesService.create(user.tenantId, dto);
  }

  /**
   * GET /expenses?type=
   * List expenses for the tenant, optionally filtered by type.
   * Valid types: FUEL, MAINTENANCE, DRIVER, OTHER
   */
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('type') type?: string) {
    // Only allow known expense types as filter (ignore unknown values)
    const validType =
      type && (EXPENSE_TYPES as readonly string[]).includes(type)
        ? type
        : undefined;
    return this.expensesService.findAll(user.tenantId, validType);
  }
}
