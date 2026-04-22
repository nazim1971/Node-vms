import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Fields that must never be serialised in any API response. */
const HIDDEN_FIELDS = new Set(['password']);

@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.strip(data)));
  }

  private strip(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((item) => this.strip(item));

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (!HIDDEN_FIELDS.has(key)) {
        result[key] = this.strip(value);
      }
    }
    return result;
  }
}
