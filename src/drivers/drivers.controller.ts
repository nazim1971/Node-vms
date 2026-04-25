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
import { DriversService } from './drivers.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Feature } from '../common/decorators/feature.decorator';
import { Role } from '../../generated/prisma';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('drivers')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE)
@Feature('vehicles')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /** POST /drivers — create a driver (ADMIN only) */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: JwtPayload) {
    return this.driversService.create(user.tenantId, dto);
  }

  /** GET /drivers?branchId= — list drivers with optional branch filter */
  @Get()
  findAll(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.driversService.findAll(user.tenantId, branchId);
  }

  /** GET /drivers/:id — get a single driver */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.driversService.findOne(user.tenantId, id);
  }

  /** PATCH /drivers/:id — update driver (ADMIN only) */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.driversService.update(user.tenantId, id, dto);
  }

  /** DELETE /drivers/:id — soft-delete (ADMIN only) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.driversService.remove(user.tenantId, id);
  }
}
