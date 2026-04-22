import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('audit')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit?entity=vehicles&entityId=abc&userId=xyz&startDate=&endDate=
   * Returns the last 500 audit entries for the tenant (newest first).
   * ADMIN and SUPER_ADMIN only.
   */
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: AuditQueryDto) {
    return this.auditService.findAll(user.tenantId, query);
  }
}
