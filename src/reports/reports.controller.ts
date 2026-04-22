import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../../generated/prisma';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** GET /reports/mileage?vehicleId=&startDate=&endDate= */
  @Get('mileage')
  getMileage(@CurrentUser() user: JwtPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getMileageReport(user.tenantId, query);
  }

  /** GET /reports/fuel?vehicleId=&startDate=&endDate= */
  @Get('fuel')
  getFuel(@CurrentUser() user: JwtPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getFuelReport(user.tenantId, query);
  }

  /** GET /reports/profit-loss?startDate=&endDate= */
  @Get('profit-loss')
  getProfitLoss(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getProfitLossReport(user.tenantId, query);
  }

  /** GET /reports/vehicle-usage?vehicleId=&startDate=&endDate= */
  @Get('vehicle-usage')
  getVehicleUsage(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getVehicleUsageReport(user.tenantId, query);
  }
}
