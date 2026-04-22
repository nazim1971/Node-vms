import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('fuel')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  /**
   * POST /fuel
   * Add a fuel log entry for a vehicle.
   * Odometer must be >= the last recorded reading for that vehicle.
   */
  @Post()
  addLog(@Body() dto: CreateFuelLogDto, @CurrentUser() user: JwtPayload) {
    return this.fuelService.addLog(user.tenantId, dto);
  }

  /**
   * GET /fuel?vehicleId=
   * List fuel logs for the tenant, optionally filtered by vehicle.
   */
  @Get()
  listLogs(
    @CurrentUser() user: JwtPayload,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fuelService.listLogs(user.tenantId, vehicleId);
  }
}
