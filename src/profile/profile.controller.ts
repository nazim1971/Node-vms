import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeNameDto } from './dto/change-name.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * /profile — self-service endpoints available to ALL authenticated roles.
 * No @Roles() restriction — any logged-in user can access these.
 */
@Controller('profile')
@UseGuards(RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /** GET /profile — fetch the current user's own profile */
  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }

  /**
   * PATCH /profile/password
   * Change own password — requires the current password for verification.
   * Available to: SUPER_ADMIN, ADMIN, DRIVER, EMPLOYEE
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.profileService.changePassword(user.sub, dto);
  }

  /**
   * PATCH /profile/name
   * Change own display name only.
   * Available to: SUPER_ADMIN, ADMIN, DRIVER, EMPLOYEE
   */
  @Patch('name')
  @HttpCode(HttpStatus.OK)
  changeName(@Body() dto: ChangeNameDto, @CurrentUser() user: JwtPayload) {
    return this.profileService.changeName(user.sub, dto);
  }
}
