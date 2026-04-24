import { Module } from '@nestjs/common';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminApplicationsService } from './admin-applications.service';

@Module({
  controllers: [AdminApplicationsController],
  providers: [AdminApplicationsService],
  exports: [AdminApplicationsService],
})
export class AdminApplicationsModule {}
