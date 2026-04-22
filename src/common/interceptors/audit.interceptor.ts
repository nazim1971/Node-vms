import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** Path segments that are verbs/actions, not entity IDs */
const PATH_KEYWORDS = new Set([
  'start',
  'end',
  'items',
  'status',
  'read',
  'dismiss',
  'scan',
  'confirm',
  'cancel',
  'location',
  'latest',
  'history',
  'profit-loss',
  'expiring',
  'jobs',
]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: JwtPayload;
    }>();

    const { method, url } = request;
    const user = request.user;

    if (!MUTATION_METHODS.has(method) || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const { entity, entityId } = this.extractMeta(url, responseBody);
        this.auditService
          .log(user.tenantId, user.sub, method, entity, entityId)
          .catch((err: unknown) => {
            this.logger.error(`Audit log failed: ${(err as Error).message}`);
          });
      }),
    );
  }

  private extractMeta(
    url: string,
    body: unknown,
  ): { entity: string; entityId: string } {
    const path = url.split('?')[0] ?? '';
    const parts = path.split('/').filter(Boolean);

    const entity = parts[0] ?? 'unknown';

    // Prefer id from response body
    const fromBody =
      body !== null &&
      body !== undefined &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'id' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).id)
        : null;

    // Fall back to path segment if it looks like an id (not a keyword)
    const fromUrl = parts[1] && !PATH_KEYWORDS.has(parts[1]) ? parts[1] : null;

    return { entity, entityId: fromBody ?? fromUrl ?? 'unknown' };
  }
}
