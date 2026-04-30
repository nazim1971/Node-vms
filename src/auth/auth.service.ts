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
import { ApprovalStatus, Role } from '../../generated/prisma';
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

    // Check approval status before isActive (gives a better error message)
    if (user.role === Role.ADMIN) {
      if (user.approvalStatus === ApprovalStatus.PENDING) {
        throw new ForbiddenException(
          'Your account is pending approval by the platform administrator',
        );
      }
      if (user.approvalStatus === ApprovalStatus.REJECTED) {
        throw new ForbiddenException(
          'Your account application has been rejected',
        );
      }
      if (user.approvalStatus === ApprovalStatus.SUSPENDED) {
        throw new ForbiddenException('Your account has been suspended');
      }
    }

    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    if (!user.tenant.isActive)
      throw new ForbiddenException('Tenant is suspended');

    return this.generateTokenPair(user);
  }

  /**
   * Public registration — creates a new TENANT + ADMIN user with PENDING status.
   * The admin cannot log in until a SUPER_ADMIN approves the application.
   */
  async registerTenant(dto: RegisterTenantDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        // Tenant starts inactive until admin is approved
        isActive: false,
        users: {
          create: {
            name: dto.adminName,
            email: dto.email,
            password: hashedPassword,
            role: Role.ADMIN,
            approvalStatus: ApprovalStatus.PENDING,
            isActive: false,
          },
        },
      },
    });

    return {
      message:
        'Registration submitted successfully. Your account is pending approval by the platform administrator. You will be notified once approved.',
    };
  }

  /**
   * One-time seed: creates the platform SUPER_ADMIN + system tenant.
   * Protected by SEED_SECRET env var — must only be called once.
   */
  async seedSuperAdmin(dto: {
    name: string;
    email: string;
    password: string;
    seedSecret: string;
  }) {
    const expectedSecret = this.config.getOrThrow<string>('SEED_SECRET');
    if (dto.seedSecret !== expectedSecret) {
      throw new ForbiddenException('Invalid seed secret');
    }

    const existing = await this.prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Super admin already exists');
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: 'Platform (System)',
        isActive: true,
        users: {
          create: {
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: Role.SUPER_ADMIN,
            approvalStatus: ApprovalStatus.APPROVED,
            isActive: true,
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    if (!user) throw new Error('Failed to create super admin');
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

  /** Decode a signed JWT payload without re-verifying (for controller use after sign). */
  decodePayload(token: string): JwtPayload {
    return this.jwtService.decode<JwtPayload>(token) as JwtPayload;
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
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ??
        '15m') as unknown as number,
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
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
        '7d') as unknown as number,
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
