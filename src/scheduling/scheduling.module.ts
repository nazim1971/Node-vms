import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService], // exported for BookingModule to use
})
export class SchedulingModule {}
