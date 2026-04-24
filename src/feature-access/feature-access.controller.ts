import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { FeatureAccessService } from './feature-access.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('feature-access')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class FeatureAccessController {
  constructor(private readonly featureAccessService: FeatureAccessService) {}

  /** GET /feature-access — list all feature flags for the current tenant */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.featureAccessService.findAll(user.tenantId);
  }

  /** PATCH /feature-access/:moduleName/enable — enable a feature module */
  @Patch(':moduleName/enable')
  @Roles(Role.SUPER_ADMIN)
  enable(@Param('moduleName') moduleName: string, @CurrentUser() user: JwtPayload) {
    return this.featureAccessService.enable(user.tenantId, moduleName);
  }

  /** PATCH /feature-access/:moduleName/disable — disable a feature module */
  @Patch(':moduleName/disable')
  @Roles(Role.SUPER_ADMIN)
  disable(@Param('moduleName') moduleName: string, @CurrentUser() user: JwtPayload) {
    return this.featureAccessService.disable(user.tenantId, moduleName);
  }
}
