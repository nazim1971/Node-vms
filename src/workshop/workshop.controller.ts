import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkshopJobStatus } from '../../generated/prisma';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../../generated/prisma';
import { WorkshopService } from './workshop.service';
import { CreateWorkshopJobDto } from './dto/create-job.dto';
import { AddWorkshopItemDto } from './dto/add-item.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Controller('workshop')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  /**
   * POST /workshop/jobs
   * Open a new workshop job card.
   */
  @Post('jobs')
  createJob(
    @Body() dto: CreateWorkshopJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workshopService.createJob(user.tenantId, dto);
  }

  /**
   * GET /workshop/jobs?status=OPEN|IN_PROGRESS|COMPLETED|CANCELLED
   * List all jobs, optionally filtered by status.
   */
  @Get('jobs')
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    const validStatus = Object.values(WorkshopJobStatus).includes(
      status as WorkshopJobStatus,
    )
      ? (status as WorkshopJobStatus)
      : undefined;
    return this.workshopService.findAll(user.tenantId, validStatus);
  }

  /**
   * GET /workshop/jobs/:id
   * Get a single job with all parts/labor items — this is the final bill view.
   */
  @Get('jobs/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workshopService.findOne(user.tenantId, id);
  }

  /**
   * POST /workshop/jobs/:id/items
   * Add a part or labor line item to the job.
   * Automatically increments job totalCost.
   */
  @Post('jobs/:id/items')
  addItem(
    @Param('id') id: string,
    @Body() dto: AddWorkshopItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workshopService.addItem(user.tenantId, id, dto);
  }

  /**
   * PATCH /workshop/jobs/:id/status
   * Transition job status: IN_PROGRESS | COMPLETED | CANCELLED
   */
  @Patch('jobs/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workshopService.updateStatus(user.tenantId, id, dto.status);
  }
}
