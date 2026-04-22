import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { ProfitLossQueryDto } from './dto/profit-loss-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('accounting')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  /**
   * GET /accounting/profit-loss?startDate=&endDate=
   * Calculate total income, expenses, and profit/loss for the tenant.
   * Date range is optional — omit for all-time totals.
   */
  @Get('profit-loss')
  getProfitLoss(
    @Query() query: ProfitLossQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getProfitLoss(user.tenantId, query);
  }
}
