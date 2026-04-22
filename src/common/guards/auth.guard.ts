import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REDIS_CLIENT } from '../redis/redis.module';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Record<string, unknown> & { headers: Record<string, string> }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing authentication token');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const isBlacklisted = await this.redis
      .get(`blacklist:${token}`)
      .catch(() => null);
    if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

    request['user'] = payload;
    request['token'] = token;
    return true;
  }

  private extractToken(request: { headers: Record<string, string> }): string | undefined {
    const auth = request.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}

