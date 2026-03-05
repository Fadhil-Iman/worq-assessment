import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('stores and returns the webhook', () => {
      const wh = service.register({ url: 'https://example.com/hook' });

      expect(wh.id).toBeDefined();
      expect(wh.url).toBe('https://example.com/hook');
      expect(service.findAll()).toHaveLength(1);
    });

    it('can register multiple webhooks', () => {
      service.register({ url: 'https://a.com/hook' });
      service.register({ url: 'https://b.com/hook' });

      expect(service.findAll()).toHaveLength(2);
    });
  });

  // ── dispatch ───────────────────────────────────────────────────────────────

  describe('dispatch', () => {
    it('posts to all registered URLs', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });
      service.register({ url: 'https://a.com/hook' });
      service.register({ url: 'https://b.com/hook' });

      await service.dispatch('booking.created', { id: '123' });
      // Allow microtasks to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('includes the event name and data in the payload', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });
      service.register({ url: 'https://example.com/hook' });

      await service.dispatch('booking.cancelled', { id: 'abc' });
      await new Promise((r) => setTimeout(r, 50));

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect(payload).toMatchObject({
        event: 'booking.cancelled',
        data: { id: 'abc' },
      });
    });

    it('retries up to 3 times on failure then gives up', async () => {
      mockedAxios.post.mockRejectedValue(new Error('network error'));
      service.register({ url: 'https://example.com/hook' });

      await service.dispatch('booking.created', { id: '123' });
      // Wait long enough for 3 retries with back-off (0 + 500 + 1000ms)
      await new Promise((r) => setTimeout(r, 2500));

      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    }, 10_000);

    it('does nothing when no webhooks are registered', async () => {
      await service.dispatch('booking.created', { id: '123' });
      await new Promise((r) => setTimeout(r, 50));

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});