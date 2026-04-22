import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { UpdateTripDto } from './dto/update-trip.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('trips')
@UseGuards(RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * POST /trips/start/:vehicleId
   * Only a DRIVER with an active assignment to the vehicle can start a trip.
   */
  @Post('start/:vehicleId')
  @Roles(Role.DRIVER)
  startTrip(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tripsService.startTrip(vehicleId, user.tenantId, user.sub);
  }

  /**
   * POST /trips/:tripId/end
   * The assigned driver (or ADMIN/EMPLOYEE) can end the trip and submit final costs.
   */
  @Post(':tripId/end')
  @Roles(Role.DRIVER, Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  endTrip(
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tripsService.endTrip(
      tripId,
      user.tenantId,
      user.sub,
      dto,
      user.role,
    );
  }

  /**
   * PATCH /trips/:tripId
   * Update tollCost, policeCost, income, distance on any trip (active or completed).
   * ADMIN/EMPLOYEE only — not DRIVER.
   */
  @Patch(':tripId')
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  updateTrip(
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tripsService.updateTrip(tripId, user.tenantId, dto);
  }

  /**
   * GET /trips
   * List all trips for the tenant.
   */
  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  listTrips(@CurrentUser() user: JwtPayload) {
    return this.tripsService.listTrips(user.tenantId);
  }

  /**
   * GET /trips/:tripId
   * Get a single trip. DRIVER can see their own via this — service doesn't restrict.
   */
  @Get(':tripId')
  @Roles(Role.DRIVER, Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  getTrip(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.tripsService.getTrip(tripId, user.tenantId);
  }
}
