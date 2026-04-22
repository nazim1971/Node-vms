import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AssignDriverVehicleDto } from './dto/assign-driver-vehicle.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('bookings')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** POST /bookings — create a new PENDING booking */
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(user.tenantId, dto);
  }

  /** GET /bookings — list all bookings for the tenant */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.findAll(user.tenantId);
  }

  /** GET /bookings/:id — get a single booking */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.findOne(user.tenantId, id);
  }

  /** PATCH /bookings/:id/confirm — manually confirm a PENDING booking */
  @Patch(':id/confirm')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  confirm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.confirm(user.tenantId, id);
  }

  /** PATCH /bookings/:id/cancel — cancel a booking */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.cancel(user.tenantId, id);
  }

  /** PATCH /bookings/:id/assign — assign/reassign driver + vehicle */
  @Patch(':id/assign')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDriverVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.assign(user.tenantId, id, dto);
  }
}
