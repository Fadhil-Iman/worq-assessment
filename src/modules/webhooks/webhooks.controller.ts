import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { RegisterWebhookDto } from './dto/create-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /webhooks
   * Register a URL to be called on booking events.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterWebhookDto) {
    return this.webhooksService.register(dto);
  }

  /**
   * GET /webhooks
   * List all registered webhook URLs (useful for debugging).
   */
  @Get()
  findAll() {
    return this.webhooksService.findAll();
  }
}