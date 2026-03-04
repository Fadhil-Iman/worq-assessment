import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { RegisterWebhookDto } from './dto/create-webhook.dto';
import { Webhook } from './entities/webhook.entity';

export type WebhookEvent = 'booking.created' | 'booking.cancelled';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // In-memory store: id → Webhook
  private readonly store = new Map<string, Webhook>();

  register(dto: RegisterWebhookDto): Webhook {
    const webhook: Webhook = {
      id: uuidv4(),
      url: dto.url,
      createdAt: new Date(),
    };
    this.store.set(webhook.id, webhook);
    this.logger.log(`Webhook registered: ${webhook.id} → ${webhook.url}`);
    return webhook;
  }

  findAll(): Webhook[] {
    return [...this.store.values()];
  }

  /**
   * Dispatch an event to every registered webhook URL.
   * Each dispatch is independent — one failure won't block others.
   * Retries up to MAX_RETRIES times with exponential back-off.
   */
  async dispatch(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const webhooks = this.findAll();
    if (webhooks.length === 0) return;

    // Fire all dispatches concurrently; don't await — non-blocking
    Promise.all(
      webhooks.map((wh) => this.dispatchWithRetry(wh, payload)),
    ).catch(() => {
      // Swallow top-level rejection — individual errors are already logged
    });
  }

  private async dispatchWithRetry(
    webhook: Webhook,
    payload: WebhookPayload,
    attempt = 1,
  ): Promise<void> {
    try {
      await axios.post(webhook.url, payload, { timeout: 5000 });
      this.logger.log(`Webhook ${webhook.id} delivered (attempt ${attempt})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Webhook ${webhook.id} attempt ${attempt} failed: ${message}`,
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * 2 ** (attempt - 1); // exponential back-off
        this.logger.log(`Retrying webhook ${webhook.id} in ${delay}ms…`);
        await this.sleep(delay);
        await this.dispatchWithRetry(webhook, payload, attempt + 1);
      } else {
        this.logger.error(
          `Webhook ${webhook.id} permanently failed after ${MAX_RETRIES} attempts`,
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}