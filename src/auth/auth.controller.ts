import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { SeedSuperAdminDto } from './dto/seed-super-admin.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const IS_PROD = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken?: string,
): void {
  const base = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
  };
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...base,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}

function clearTokenCookies(res: Response): void {
  const opts = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

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

  /** Login — tokens go into httpOnly cookies; only user info in response body. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    setTokenCookies(res, accessToken, refreshToken);
    const payload = this.authService.decodePayload(accessToken);
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    };
  }

  /**
   * Refresh — reads refresh token from httpOnly cookie, issues a new access token cookie.
   * No token is ever exposed in the request or response body.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const { accessToken } = await this.authService.refresh({ refreshToken });
    setTokenCookies(res, accessToken);
    return { success: true };
  }

  /** Logout — blacklists the current access token and clears both auth cookies. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { token?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.token ?? '';
    const exp = user.exp ?? 0;
    clearTokenCookies(res);
    return this.authService.logout(token, exp);
  }

  /**
   * One-time seed endpoint — creates the platform SUPER_ADMIN.
   * Requires seedSecret in body matching SEED_SECRET env var.
   * Will fail if a SUPER_ADMIN already exists.
   */
  @Public()
  @Post('seed-super-admin')
  @HttpCode(HttpStatus.CREATED)
  async seedSuperAdmin(
    @Body() dto: SeedSuperAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.seedSuperAdmin(dto);
    setTokenCookies(res, accessToken, refreshToken);
    const payload = this.authService.decodePayload(accessToken);
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    };
  }
}
