import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const user = request['user'] as JwtPayload | undefined;
    if (!user) return false;

    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.sub, deletedAt: null },
      include: { tenant: true },
    });

    if (!dbUser) throw new UnauthorizedException('User not found');
    if (!dbUser.isActive)
      throw new UnauthorizedException('Account is inactive');
    if (!dbUser.tenant.isActive)
      throw new ForbiddenException('Tenant is suspended');

    return true;
  }
}
