import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

const mockWebhook = {
  id: 'test-uuid-1',
  url: 'https://example.com/hook',
  createdAt: new Date(),
};

const mockWebhooksService = {
  register: jest.fn(),
  findAll: jest.fn(),
};

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── POST /webhooks ──────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { url: 'https://example.com/hook' };

    it('returns the registered webhook', () => {
      mockWebhooksService.register.mockReturnValue(mockWebhook);

      const result = controller.register(dto);

      expect(result).toEqual(mockWebhook);
      expect(mockWebhooksService.register).toHaveBeenCalledWith(dto);
    });

    it('propagates BadRequestException for an invalid URL', () => {
      mockWebhooksService.register.mockImplementation(() => {
        throw new BadRequestException('url must be a valid URL');
      });

      expect(() => controller.register({ url: 'not-a-url' })).toThrow(BadRequestException);
    });
  });

  // ── GET /webhooks ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns an array of webhooks', () => {
      mockWebhooksService.findAll.mockReturnValue([mockWebhook]);

      const result = controller.findAll();

      expect(result).toEqual([mockWebhook]);
      expect(mockWebhooksService.findAll).toHaveBeenCalled();
    });

    it('returns an empty array when none are registered', () => {
      mockWebhooksService.findAll.mockReturnValue([]);

      const result = controller.findAll();

      expect(result).toEqual([]);
    });
  });
});