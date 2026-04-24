import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminApplicationsService } from './admin-applications.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { RejectApplicationDto } from './dto/reject-application.dto';

@Controller('admin-applications')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminApplicationsController {
  constructor(
    private readonly adminApplicationsService: AdminApplicationsService,
  ) {}

  /**
   * GET /admin-applications?status=PENDING
   * List all admin registrations. Filter by status: PENDING | APPROVED | REJECTED | SUSPENDED
   */
  @Get()
  findAll(@Query('status') status?: string) {
    return this.adminApplicationsService.findAll(status);
  }

  /**
   * PATCH /admin-applications/:userId/approve
   * Approve a pending admin application — activates the user and their tenant.
   */
  @Patch(':userId/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('userId') userId: string) {
    return this.adminApplicationsService.approve(userId);
  }

  /**
   * PATCH /admin-applications/:userId/reject
   * Reject a pending admin application.
   */
  @Patch(':userId/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('userId') userId: string, @Body() dto: RejectApplicationDto) {
    return this.adminApplicationsService.reject(userId, dto.reason);
  }

  /**
   * PATCH /admin-applications/:userId/suspend
   * Suspend an active admin account (emergency override).
   */
  @Patch(':userId/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('userId') userId: string) {
    return this.adminApplicationsService.suspend(userId);
  }

  /**
   * PATCH /admin-applications/:userId/reactivate
   * Reactivate a suspended admin account.
   */
  @Patch(':userId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('userId') userId: string) {
    return this.adminApplicationsService.reactivate(userId);
  }
}
