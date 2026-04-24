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
import { BranchesService } from './branches.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('branches')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /** POST /branches — create a new branch (ADMIN only) */
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: JwtPayload) {
    return this.branchesService.create(user.tenantId, dto);
  }

  /** GET /branches — list all branches with counts */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.branchesService.findAll(user.tenantId);
  }

  /**
   * GET /branches/aggregate — cross-branch summary dashboard.
   * Returns totals + per-branch stats. Must come before :id route.
   */
  @Get('aggregate')
  @Roles(Role.ADMIN)
  getAggregateSummary(@CurrentUser() user: JwtPayload) {
    return this.branchesService.getAggregateSummary(user.tenantId);
  }

  /** GET /branches/:id — single branch with full details */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.findOne(user.tenantId, id);
  }

  /** PATCH /branches/:id — update branch (ADMIN only) */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.update(user.tenantId, id, dto);
  }

  /** DELETE /branches/:id — soft-delete + unlink resources (ADMIN only) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.remove(user.tenantId, id);
  }
}
