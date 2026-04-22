import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class FeatureGuard implements CanActivate {
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

    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const user = request['user'] as JwtPayload | undefined;
    if (!user) return false;

    const access = await this.prisma.featureAccess.findFirst({
      where: {
        tenantId: user.tenantId,
        moduleName: requiredFeature,
        isEnabled: true,
        deletedAt: null,
      },
    });

    if (!access) {
      throw new ForbiddenException(`Feature '${requiredFeature}' is not enabled for this tenant`);
    }
    return true;
  }
}

