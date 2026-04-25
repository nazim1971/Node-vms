import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('subscriptions')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** POST /subscriptions — create a subscription for a tenant */
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  /** GET /subscriptions — list all subscriptions (system-wide) */
  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  /** GET /subscriptions/mine — current tenant's subscriptions (ADMIN accessible) */
  @Get('mine')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.findByTenant(user.tenantId);
  }

  /** GET /subscriptions/tenant/:tenantId — subscriptions for a specific tenant */
  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.findByTenant(tenantId);
  }

  /** GET /subscriptions/:id — get a single subscription */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  /** PATCH /subscriptions/:id — update plan name or isActive */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }
}
