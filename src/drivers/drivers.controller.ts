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
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('drivers')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /** POST /drivers — create a driver (ADMIN+) */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: JwtPayload) {
    return this.driversService.create(user.tenantId, dto);
  }

  /** GET /drivers — list drivers */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.driversService.findAll(user.tenantId);
  }

  /** GET /drivers/:id — get a single driver */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.driversService.findOne(user.tenantId, id);
  }

  /** PATCH /drivers/:id — update driver (ADMIN+) */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.driversService.update(user.tenantId, id, dto);
  }

  /** DELETE /drivers/:id — soft-delete (ADMIN+) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.driversService.remove(user.tenantId, id);
  }
}
