import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

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
      catchError((error: unknown) => {
        const { entity, entityId } = this.extractMeta(url, undefined);
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        const errorMessage = this.extractErrorMessage(error);

        this.auditService
          .log(user.tenantId, user.sub, method, entity, entityId, {
            success: false,
            statusCode,
            errorMessage,
          })
          .catch((auditError: unknown) => {
            this.logger.error(
              `Audit log failed: ${(auditError as Error).message}`,
            );
          });

        throw error;
      }),
    );
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in (response as Record<string, unknown>)
      ) {
        const message = (response as Record<string, unknown>)['message'];
        if (Array.isArray(message)) {
          return message.map(String).join('; ');
        }
        return String(message);
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Internal server error';
  }

  private extractMeta(
    url: string,
    body: unknown,
  ): { entity: string; entityId: string } {
    const path = url.split('?')[0] ?? '';
    const parts = path.split('/').filter(Boolean);

    const entity = parts[0] ?? 'unknown';

    const fromBody =
      body !== null &&
      body !== undefined &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'id' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).id)
        : null;

    const fromUrl = parts[1] && !PATH_KEYWORDS.has(parts[1]) ? parts[1] : null;

    return { entity, entityId: fromBody ?? fromUrl ?? 'unknown' };
  }
}
