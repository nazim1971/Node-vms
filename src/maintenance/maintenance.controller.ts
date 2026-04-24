import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Feature } from '../common/decorators/feature.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('maintenance')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE)
@Feature('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * POST /maintenance
   * Create a maintenance log. Provide either:
   *   - totalCost (simple mode), or
   *   - items[] (breakdown mode — totalCost auto-calculated)
   */
  @Post()
  create(
    @Body() dto: CreateMaintenanceLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenanceService.create(user.tenantId, dto);
  }

  /**
   * GET /maintenance?vehicleId=
   * List all maintenance logs. Optionally filter by vehicle.
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.maintenanceService.findAll(user.tenantId, vehicleId);
  }

  /**
   * GET /maintenance/:id
   * Get a single maintenance log with full item breakdown.
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.findOne(user.tenantId, id);
  }
}
