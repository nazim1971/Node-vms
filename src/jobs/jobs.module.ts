import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [AlertsModule],
  providers: [JobsService],
})
export class JobsModule {}
