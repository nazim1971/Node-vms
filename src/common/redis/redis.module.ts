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
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');

        // Upstash (and any remote Redis) uses TLS — detect by non-localhost host
        const useTls = host !== 'localhost' && host !== '127.0.0.1';

        const client = new Redis({
          host,
          port,
          ...(password ? { password } : {}),
          ...(useTls ? { tls: {} } : {}),
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
