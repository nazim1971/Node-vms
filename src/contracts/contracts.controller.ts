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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('contracts')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * POST /contracts
   * Create a VEHICLE_SOURCE or CLIENT contract.
   * vehicleId is required for VEHICLE_SOURCE contracts.
   */
  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: JwtPayload) {
    return this.contractsService.create(user.tenantId, dto);
  }

  /**
   * GET /contracts/expiring?days=30
   * List contracts whose endDate falls within the next N days (default: 30).
   * Declared before /:id to prevent route shadowing.
   */
  @Get('expiring')
  findExpiring(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const daysAhead = days !== undefined ? Math.max(1, parseInt(days, 10)) : 30;
    return this.contractsService.findExpiring(user.tenantId, daysAhead);
  }

  /**
   * GET /contracts?type=VEHICLE_SOURCE|CLIENT
   * List all contracts. Optionally filter by type.
   */
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('type') type?: string) {
    return this.contractsService.findAll(user.tenantId, type);
  }

  /**
   * GET /contracts/:id
   * Get a single contract by ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.contractsService.findOne(user.tenantId, id);
  }

  /**
   * PATCH /contracts/:id
   * Update a contract's fields.
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractsService.update(user.tenantId, id, dto);
  }

  /**
   * DELETE /contracts/:id
   * Soft-delete a contract.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.contractsService.remove(user.tenantId, id);
  }
}
