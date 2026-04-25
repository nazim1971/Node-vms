import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { winstonConfig } from './common/logger/winston.config';

async function bootstrap() {
  const logger = WinstonModule.createLogger(winstonConfig);

  const app = await NestFactory.create(AppModule, { logger });

  // CORS configuration
  app.enableCors({
    origin: ['http://localhost:3000', 'https://vms.node-devs.com'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Security: Helmet sets secure HTTP headers
  app.use(helmet());

  // Security: Global rate limiter — 100 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Too many requests, please try again later.',
      },
    }),
  );

  // Validation: strip unknown fields and reject invalid input globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Error handling: hide internal error details from clients
  app.useGlobalFilters(new AllExceptionsFilter());

  // WebSocket: use Socket.IO adapter (skip on serverless — no persistent connections)
  if (!process.env['VERCEL'] && !process.env['AWS_LAMBDA_FUNCTION_NAME']) {
    app.useWebSocketAdapter(new IoAdapter(app));
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`, 'Bootstrap');
}
bootstrap().catch(console.error);
