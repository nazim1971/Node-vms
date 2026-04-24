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
import { IncomeService } from './income.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('income')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  /** POST /income — record income (ADMIN+) */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateIncomeDto, @CurrentUser() user: JwtPayload) {
    return this.incomeService.create(user.tenantId, dto);
  }

  /** GET /income — list all income records */
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.incomeService.findAll(user.tenantId);
  }

  /** GET /income/:id — get a single income record */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.incomeService.findOne(user.tenantId, id);
  }

  /** PATCH /income/:id — update income record (ADMIN+) */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incomeService.update(user.tenantId, id, dto);
  }

  /** DELETE /income/:id — soft-delete (ADMIN+) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.incomeService.remove(user.tenantId, id);
  }
}
