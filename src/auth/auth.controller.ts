import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SeedSuperAdminDto } from './dto/seed-super-admin.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public registration — submits an admin application (status: PENDING).
   * The account is inactive until approved by a SUPER_ADMIN.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { token?: string },
  ) {
    const token = req.token ?? '';
    const exp = user.exp ?? 0;
    return this.authService.logout(token, exp);
  }

  /**
   * One-time seed endpoint — creates the platform SUPER_ADMIN.
   * Requires X-Seed-Secret header matching SEED_SECRET env var.
   * Will fail if a SUPER_ADMIN already exists.
   */
  @Public()
  @Post('seed-super-admin')
  @HttpCode(HttpStatus.CREATED)
  seedSuperAdmin(@Body() dto: SeedSuperAdminDto) {
    return this.authService.seedSuperAdmin(dto);
  }
}
