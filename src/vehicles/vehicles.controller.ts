import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('vehicles')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** POST /vehicles — create a vehicle (ADMIN+) */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.create(user.tenantId, dto);
  }

  /** GET /vehicles?status= — list vehicles with optional status filter */
  @Get()
  findAll(
    @Query('status') status: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.findAll(user.tenantId, status);
  }

  /** GET /vehicles/:id — get a single vehicle */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.findOne(user.tenantId, id);
  }

  /** PATCH /vehicles/:id — update vehicle (ADMIN+) */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.update(user.tenantId, id, dto);
  }

  /** DELETE /vehicles/:id — soft-delete (ADMIN+) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.remove(user.tenantId, id);
  }
}
