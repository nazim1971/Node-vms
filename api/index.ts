import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as express from 'express';
import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { winstonConfig } from '../src/common/logger/winston.config';

const expressServer: Express = express();
let app: NestExpressApplication | undefined;

async function bootstrap(): Promise<NestExpressApplication> {
  if (app) return app;

  const logger = WinstonModule.createLogger(winstonConfig);

  app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressServer),
    { logger },
  );

  app.enableCors({
    origin: process.env['CORS_ORIGIN']
      ? process.env['CORS_ORIGIN'].split(',')
      : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.use(helmet());
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  await bootstrap();
  expressServer(req, res);
};
