import { Module } from '@nestjs/common';
import { FeatureAccessController } from './feature-access.controller';
import { FeatureAccessService } from './feature-access.service';

@Module({
  controllers: [FeatureAccessController],
  providers: [FeatureAccessService],
  exports: [FeatureAccessService],
})
export class FeatureAccessModule {}
