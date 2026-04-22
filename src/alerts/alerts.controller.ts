import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertQueryDto, ScanAlertsDto } from './dto/alert-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('alerts')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * POST /alerts/scan?daysAhead=30
   * Scan and create alerts for:
   *   - Documents expiring within daysAhead days
   *   - Contracts expiring within daysAhead days
   *   - Vehicles with no maintenance in the last 90 days
   */
  @Post('scan')
  scan(@Query() query: ScanAlertsDto, @CurrentUser() user: JwtPayload) {
    return this.alertsService.scan(user.tenantId, query.daysAhead ?? 30);
  }

  /**
   * GET /alerts?status=UNREAD|READ|DISMISSED
   * List all alerts for the tenant, optionally filtered by status.
   */
  @Get()
  findAll(@Query() query: AlertQueryDto, @CurrentUser() user: JwtPayload) {
    return this.alertsService.findAll(user.tenantId, query.status);
  }

  /**
   * PATCH /alerts/:id/read
   * Mark an alert as READ.
   */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.alertsService.markRead(user.tenantId, id);
  }

  /**
   * PATCH /alerts/:id/dismiss
   * Dismiss an alert.
   */
  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.alertsService.dismiss(user.tenantId, id);
  }
}
