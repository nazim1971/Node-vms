import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApprovalStatus, Role } from '../../../generated/prisma';
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

    // SUPER_ADMIN operates platform-wide — no tenant active check needed
    if (user.role === Role.SUPER_ADMIN) return true;

    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.sub, deletedAt: null },
      include: { tenant: true },
    });

    if (!dbUser) throw new UnauthorizedException('User not found');

    // Check approval status for ADMIN accounts
    if (dbUser.role === Role.ADMIN) {
      if (dbUser.approvalStatus === ApprovalStatus.PENDING) {
        throw new ForbiddenException(
          'Your account is pending approval by the platform administrator',
        );
      }
      if (dbUser.approvalStatus === ApprovalStatus.REJECTED) {
        throw new ForbiddenException(
          'Your account application has been rejected',
        );
      }
      if (dbUser.approvalStatus === ApprovalStatus.SUSPENDED) {
        throw new ForbiddenException('Your account has been suspended');
      }
    }

    if (!dbUser.isActive)
      throw new UnauthorizedException('Account is inactive');
    if (!dbUser.tenant.isActive)
      throw new ForbiddenException('Tenant is suspended');

    return true;
  }
}
