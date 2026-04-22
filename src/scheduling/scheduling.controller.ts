import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('scheduling')
@UseGuards(RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  /**
   * GET /scheduling/vehicle/:vehicleId?startDate=&endDate=
   * Check if a vehicle is available for the given date range.
   */
  @Get('vehicle/:vehicleId')
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  async checkVehicle(
    @Param('vehicleId') vehicleId: string,
    @Query() query: CheckAvailabilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    return this.schedulingService.checkVehicleAvailability(
      vehicleId,
      user.tenantId,
      start,
      end,
    );
  }

  /**
   * GET /scheduling/driver/:driverId?startDate=&endDate=
   * Check if a driver is available for the given date range.
   */
  @Get('driver/:driverId')
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  async checkDriver(
    @Param('driverId') driverId: string,
    @Query() query: CheckAvailabilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    return this.schedulingService.checkDriverAvailability(
      driverId,
      user.tenantId,
      start,
      end,
    );
  }
}
