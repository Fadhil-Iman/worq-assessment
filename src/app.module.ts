import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BookingsModule } from './modules/booking/booking.module';

@Module({
  imports: [BookingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
