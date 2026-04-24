import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { SaveLocationDto } from './dto/save-location.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Feature } from '../common/decorators/feature.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('tracking')
@UseGuards(RolesGuard)
@Feature('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * POST /tracking/location
   * Save a GPS location point for a vehicle.
   * Rate limited: max 1 update per vehicle per 5 seconds.
   * Stores latest in Redis + emits via WebSocket.
   * DRIVER role can also push their own location.
   */
  @Post('location')
  @Roles(Role.DRIVER, Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  saveLocation(@Body() dto: SaveLocationDto, @CurrentUser() user: JwtPayload) {
    return this.trackingService.saveLocation(user.tenantId, dto);
  }

  /**
   * GET /tracking/latest/:vehicleId
   * Get the latest GPS location for a vehicle (served from Redis cache).
   */
  @Get('latest/:vehicleId')
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  getLatest(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trackingService.getLatest(user.tenantId, vehicleId);
  }

  /**
   * GET /tracking/history/:vehicleId?limit=100
   * Get recent GPS history from the database.
   */
  @Get('history/:vehicleId')
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
  getHistory(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(500, Math.max(1, parseInt(limit, 10))) : 100;
    return this.trackingService.getHistory(user.tenantId, vehicleId, take);
  }
}
