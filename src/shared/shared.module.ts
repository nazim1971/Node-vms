import { Global, Module } from '@nestjs/common';

// Shared utilities, helpers, and cross-cutting providers live here
@Global()
@Module({
  providers: [],
  exports: [],
})
export class SharedModule {}
