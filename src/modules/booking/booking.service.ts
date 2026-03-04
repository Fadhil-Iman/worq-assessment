import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateBookingDto } from './dto/create-booking.dto';
import { WebhooksService } from '../webhooks/webhooks.service';
import { Booking } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  // In-memory store: id → Booking
  private readonly store = new Map<string, Booking>();

  constructor(private readonly webhooksService: WebhooksService) { }

  create(dto: CreateBookingDto): Booking {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    this.validateTimeRange(startTime, endTime);
    this.assertNoConflict(dto.roomName, startTime, endTime);

    const booking: Booking = {
      id: uuidv4(),
      roomName: dto.roomName,
      memberName: dto.memberName,
      startTime,
      endTime,
      createdAt: new Date(),
    };

    this.store.set(booking.id, booking);

    // Dispatch webhook non-blocking — don't let failures affect the response
    this.webhooksService.dispatch('booking.created', this.serialize(booking));

    return booking;
  }

  findAll(): Booking[] {
    return [...this.store.values()].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
  }

  cancel(id: string): Booking {
    const booking = this.store.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    this.store.delete(id);

    this.webhooksService.dispatch('booking.cancelled', this.serialize(booking));

    return booking;
  }

  // Helpers

  private validateTimeRange(startTime: Date, endTime: Date): void {
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('startTime and endTime must be valid dates');
    }
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  /**
   * Two bookings overlap when one starts before the other ends AND ends after
   * the other starts. We use strict inequality so back-to-back bookings
   * (e.g. 09:00–10:00, 10:00–11:00) are allowed.
   */
  private assertNoConflict(
    roomName: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): void {
    const conflict = [...this.store.values()].find(
      (b) =>
        b.id !== excludeId &&
        b.roomName === roomName &&
        startTime < b.endTime &&
        endTime > b.startTime,
    );

    if (conflict) {
      throw new BadRequestException(
        `Room "${roomName}" is already booked from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}`,
      );
    }
  }

  private serialize(booking: Booking): Record<string, unknown> {
    return {
      id: booking.id,
      roomName: booking.roomName,
      memberName: booking.memberName,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      createdAt: booking.createdAt.toISOString(),
    };
  }
}