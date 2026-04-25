import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const client = new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null, // do not retry — fail fast
        });
        // Swallow connection errors so the app still boots without Redis.
        // Features that depend on Redis (token blacklist, tracking cache, jobs)
        // will degrade gracefully at the call site instead of crashing on boot.
        client.on('error', () => undefined);
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
