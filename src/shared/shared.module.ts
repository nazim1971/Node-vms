import { Global, Module } from '@nestjs/common';
import { EntityValidator } from '../common/helpers/entity-validator.helper';

// Shared utilities, helpers, and cross-cutting providers live here
@Global()
@Module({
  providers: [EntityValidator],
  exports: [EntityValidator],
})
export class SharedModule {}
