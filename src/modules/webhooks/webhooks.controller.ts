import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { RegisterWebhookDto } from './dto/create-webhook.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /webhooks
   * Register a URL to be called on booking events.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a webhook' })
  register(@Body() dto: RegisterWebhookDto) {
    return this.webhooksService.register(dto);
  }

  /**
   * GET /webhooks
   * List all registered webhook URLs (useful for debugging).
   */
  @Get()
  @ApiOperation({ summary: 'List registered webhooks' })
  findAll() {
    return this.webhooksService.findAll();
  }
}