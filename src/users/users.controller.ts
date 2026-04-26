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
import { UsersService } from './users.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /users — create a user within the tenant */
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(user.tenantId, dto);
  }

  /** GET /users?branchId= — list all users in the tenant (optional branch filter) */
  @Get()
  findAll(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.findAll(user.tenantId, branchId);
  }

  /** GET /users/:id — get a single user */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(user.tenantId, id);
  }

  /** PATCH /users/:id — update user (name, role, isActive, password, branchId) */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(user.tenantId, id, dto, {
      id: user.sub,
      role: user.role as Role,
    });
  }

  /**
   * PATCH /users/:id/reset-password
   * ADMIN resets a DRIVER or EMPLOYEE password without the current password.
   * SUPER_ADMIN bypasses the role guard and can also use this endpoint.
   */
  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.resetSubordinatePassword(
      user.tenantId,
      id,
      dto.newPassword,
      user.role as Role,
    );
  }

  /** DELETE /users/:id — soft-delete a DRIVER or EMPLOYEE (ADMIN cannot delete other ADMINs) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(user.tenantId, id, {
      id: user.sub,
      role: user.role as Role,
    });
  }
}
