import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../generated/prisma';
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

    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeature) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const user = request['user'] as JwtPayload | undefined;
    if (!user) return false;

    // SUPER_ADMIN bypasses all feature flag checks
    if (user.role === Role.SUPER_ADMIN) return true;

    // Opt-out model: if no record exists, the feature is ENABLED by default.
    // A record with isEnabled=false explicitly disables the feature.
    const record = await this.prisma.featureAccess.findFirst({
      where: {
        tenantId: user.tenantId,
        moduleName: requiredFeature,
        deletedAt: null,
      },
    });

    // No record = feature enabled (opt-out default)
    if (!record) return true;

    if (!record.isEnabled) {
      throw new ForbiddenException(
        `Module '${requiredFeature}' is disabled for your account. Contact your administrator.`,
      );
    }

    return true;
  }
}
