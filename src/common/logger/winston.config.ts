import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const isServerlessRuntime =
  process.env['VERCEL'] === '1' ||
  Boolean(process.env['AWS_LAMBDA_FUNCTION_NAME']);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.ms(),
      nestWinstonModuleUtilities.format.nestLike('VMS', {
        colors: true,
        prettyPrint: true,
      }),
    ),
  }),
];

if (!isServerlessRuntime) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
}

export const winstonConfig: winston.LoggerOptions = {
  transports,
};
