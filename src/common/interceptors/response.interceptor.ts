import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiMeta {
  timestamp: string;
  path: string;
  count?: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

/**
 * ResponseInterceptor — wraps every successful response in a consistent
 * envelope: { success, data, meta: { timestamp, path, count? } }.
 *
 * Registered as the outermost APP_INTERCEPTOR so it runs LAST on the
 * response chain (after SensitiveFieldsInterceptor strips passwords and
 * AuditInterceptor captures entity IDs from the raw flat data).
 *
 * null/undefined responses pass through untouched (preserves 204 No Content).
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;

    return next.handle().pipe(
      map((data: unknown) => {
        // Preserve 204 No Content — don't wrap null/undefined
        if (data === null || data === undefined) return data;

        const meta: ApiMeta = {
          timestamp: new Date().toISOString(),
          path,
        };

        if (Array.isArray(data)) {
          meta.count = data.length;
        }

        return {
          success: true,
          data,
          meta,
        } satisfies ApiResponse<unknown>;
      }),
    );
  }
}
