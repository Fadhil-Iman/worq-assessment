import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from '../webhooks/webhooks.service';
import { BookingsService } from './booking.service';

const mockWebhooksService = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });


  describe('create', () => {
    it('creates a booking and returns it', () => {
      const booking = service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      expect(booking).toMatchObject({
        roomName: 'Boardroom',
        memberName: 'Alice',
      });
      expect(booking.id).toBeDefined();
    });

    it('dispatches a booking.created webhook', () => {
      service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      expect(mockWebhooksService.dispatch).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({ roomName: 'Boardroom' }),
      );
    });

    it('rejects when endTime is before startTime', () => {
      expect(() =>
        service.create({
          roomName: 'Boardroom',
          memberName: 'Alice',
          startTime: '2025-06-01T10:00:00Z',
          endTime: '2025-06-01T09:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects when endTime equals startTime', () => {
      expect(() =>
        service.create({
          roomName: 'Boardroom',
          memberName: 'Alice',
          startTime: '2025-06-01T10:00:00Z',
          endTime: '2025-06-01T10:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects overlapping bookings for the same room', () => {
      service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T11:00:00Z',
      });

      expect(() =>
        service.create({
          roomName: 'Boardroom',
          memberName: 'Bob',
          startTime: '2025-06-01T10:00:00Z',
          endTime: '2025-06-01T12:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('allows back-to-back bookings (end === next start)', () => {
      service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      expect(() =>
        service.create({
          roomName: 'Boardroom',
          memberName: 'Bob',
          startTime: '2025-06-01T10:00:00Z',
          endTime: '2025-06-01T11:00:00Z',
        }),
      ).not.toThrow();
    });

    it('allows same time slot in a different room', () => {
      service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      expect(() =>
        service.create({
          roomName: 'Meeting Room A',
          memberName: 'Bob',
          startTime: '2025-06-01T09:00:00Z',
          endTime: '2025-06-01T10:00:00Z',
        }),
      ).not.toThrow();
    });
  });

  //findAll

  describe('findAll', () => {
    it('returns bookings sorted by startTime', () => {
      service.create({
        roomName: 'Room A',
        memberName: 'Alice',
        startTime: '2025-06-01T11:00:00Z',
        endTime: '2025-06-01T12:00:00Z',
      });
      service.create({
        roomName: 'Room B',
        memberName: 'Bob',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      const [first, second] = service.findAll();
      expect(first.memberName).toBe('Bob');
      expect(second.memberName).toBe('Alice');
    });
  });

  //cancel

  describe('cancel', () => {
    it('removes the booking and returns it', () => {
      const booking = service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      const cancelled = service.cancel(booking.id);
      expect(cancelled.id).toBe(booking.id);
      expect(service.findAll()).toHaveLength(0);
    });

    it('dispatches a booking.cancelled webhook', () => {
      const booking = service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      jest.clearAllMocks();
      service.cancel(booking.id);

      expect(mockWebhooksService.dispatch).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({ id: booking.id }),
      );
    });

    it('throws NotFoundException for unknown id', () => {
      expect(() => service.cancel('non-existent-id')).toThrow(NotFoundException);
    });

    it('frees the slot so the room can be rebooked', () => {
      const booking = service.create({
        roomName: 'Boardroom',
        memberName: 'Alice',
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T10:00:00Z',
      });

      service.cancel(booking.id);

      expect(() =>
        service.create({
          roomName: 'Boardroom',
          memberName: 'Bob',
          startTime: '2025-06-01T09:00:00Z',
          endTime: '2025-06-01T10:00:00Z',
        }),
      ).not.toThrow();
    });
  });
});