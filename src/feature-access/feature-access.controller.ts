import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeatureAccessService } from './feature-access.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('feature-access')
@UseGuards(RolesGuard)
export class FeatureAccessController {
  constructor(private readonly featureAccessService: FeatureAccessService) {}

  /**
   * GET /feature-access
   * ADMIN — view own tenant feature flags
   * SUPER_ADMIN — view any tenant via ?tenantId=
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    const target =
      user.role === Role.SUPER_ADMIN && tenantId ? tenantId : user.tenantId;
    return this.featureAccessService.findAll(target);
  }

  /**
   * PATCH /feature-access/:tenantId/:moduleName/enable
   * SUPER_ADMIN only — enable a feature for a specific tenant
   */
  @Patch(':tenantId/:moduleName/enable')
  @Roles(Role.SUPER_ADMIN)
  enable(
    @Param('tenantId') tenantId: string,
    @Param('moduleName') moduleName: string,
  ) {
    return this.featureAccessService.enable(tenantId, moduleName);
  }

  /**
   * PATCH /feature-access/:tenantId/:moduleName/disable
   * SUPER_ADMIN only — disable a feature for a specific tenant
   */
  @Patch(':tenantId/:moduleName/disable')
  @Roles(Role.SUPER_ADMIN)
  disable(
    @Param('tenantId') tenantId: string,
    @Param('moduleName') moduleName: string,
  ) {
    return this.featureAccessService.disable(tenantId, moduleName);
  }
}
