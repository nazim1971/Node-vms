import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status: HttpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Never expose internals on 500. For other errors, normalize to string|string[].
    const message = this.normalizeMessage(status, rawMessage);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private normalizeMessage(
    status: HttpStatus,
    rawMessage: unknown,
  ): string | string[] {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    if (typeof rawMessage === 'string') {
      return rawMessage;
    }

    if (
      rawMessage &&
      typeof rawMessage === 'object' &&
      'message' in (rawMessage as Record<string, unknown>)
    ) {
      const message = (rawMessage as Record<string, unknown>)['message'];
      if (Array.isArray(message)) {
        return message.map(String);
      }
      return String(message);
    }

    return 'Request failed';
  }
}
