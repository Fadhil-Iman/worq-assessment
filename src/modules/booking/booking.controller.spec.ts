import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';

const mockBooking = {
  id: 'test-uuid-1',
  roomName: 'Boardroom',
  memberName: 'Alice',
  startTime: new Date('2025-06-01T09:00:00Z'),
  endTime: new Date('2025-06-01T10:00:00Z'),
  createdAt: new Date(),
};

const mockBookingsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  cancel: jest.fn(),
};

describe('BookingsController', () => {
  let controller: BookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── POST /bookings ──────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      roomName: 'Boardroom',
      memberName: 'Alice',
      startTime: '2025-06-01T09:00:00Z',
      endTime: '2025-06-01T10:00:00Z',
    };

    it('returns the created booking', () => {
      mockBookingsService.create.mockReturnValue(mockBooking);

      const result = controller.create(dto);

      expect(result).toEqual(mockBooking);
      expect(mockBookingsService.create).toHaveBeenCalledWith(dto);
    });

    it('propagates BadRequestException on room conflict', () => {
      mockBookingsService.create.mockImplementation(() => {
        throw new BadRequestException('Room already booked');
      });

      expect(() => controller.create(dto)).toThrow(BadRequestException);
    });
  });

  // ── GET /bookings ───────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns an array of bookings', () => {
      mockBookingsService.findAll.mockReturnValue([mockBooking]);

      const result = controller.findAll();

      expect(result).toEqual([mockBooking]);
      expect(mockBookingsService.findAll).toHaveBeenCalled();
    });

    it('returns an empty array when there are no bookings', () => {
      mockBookingsService.findAll.mockReturnValue([]);

      const result = controller.findAll();

      expect(result).toEqual([]);
    });
  });

  // ── DELETE /bookings/:id ────────────────────────────────────────────────────

  describe('cancel', () => {
    it('returns the cancelled booking', () => {
      mockBookingsService.cancel.mockReturnValue(mockBooking);

      const result = controller.cancel('test-uuid-1');

      expect(result).toEqual(mockBooking);
      expect(mockBookingsService.cancel).toHaveBeenCalledWith('test-uuid-1');
    });

    it('propagates NotFoundException for unknown id', () => {
      mockBookingsService.cancel.mockImplementation(() => {
        throw new NotFoundException('Booking not found');
      });

      expect(() => controller.cancel('non-existent-id')).toThrow(NotFoundException);
    });
  });
});