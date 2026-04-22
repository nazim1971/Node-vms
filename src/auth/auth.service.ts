import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { Role } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    if (!user.tenant.isActive) throw new ForbiddenException('Tenant is suspended');

    return this.generateTokenPair(user);
  }

  async registerTenant(dto: RegisterTenantDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        users: {
          create: {
            name: dto.adminName,
            email: dto.email,
            password: hashedPassword,
            role: Role.SUPER_ADMIN,
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    if (!user) throw new Error('Failed to create admin user');
    return this.generateTokenPair(user);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: { tenant: true },
    });
    if (!user || !user.tenant.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { accessToken: this.signAccessToken(user) };
  }

  async logout(token: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${token}`, '1', 'EX', ttl);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result !== null;
    } catch {
      // Redis unavailable — fail open (log in prod, acceptable for dev)
      return false;
    }
  }

  private signAccessToken(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') as unknown as number,
    });
  }

  private signRefreshToken(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') as unknown as number,
    });
  }

  private generateTokenPair(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  }) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }
}

