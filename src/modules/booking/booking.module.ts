import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BookingsService } from './booking.service';
import { BookingsController } from './booking.controller';

@Module({
  imports: [WebhooksModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}