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
import { Feature } from '../common/decorators/feature.decorator';
import { Role } from '../../generated/prisma';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('vehicles')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE)
@Feature('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** POST /vehicles — create a vehicle (ADMIN only) */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.create(user.tenantId, dto);
  }

  /** GET /vehicles?status=&branchId= — list vehicles with optional filters */
  @Get()
  findAll(
    @Query('status') status: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.findAll(user.tenantId, status, branchId);
  }

  /** GET /vehicles/:id — get a single vehicle */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.findOne(user.tenantId, id);
  }

  /** PATCH /vehicles/:id — update vehicle (ADMIN only) */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.update(user.tenantId, id, dto);
  }

  /** DELETE /vehicles/:id — soft-delete (ADMIN only) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.remove(user.tenantId, id);
  }
}
