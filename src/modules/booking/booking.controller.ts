import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './booking.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * POST /bookings
   * Create a new room booking. Returns 409 if the room is already taken.
   */
  @Post()
  @ApiOperation({ summary: 'Create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Room conflict or invalid dates' })
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  /**
   * GET /bookings
   * Return all bookings sorted by start time.
   */
  @Get()
  @ApiOperation({ summary: 'List all bookings' })
  findAll() {
    return this.bookingsService.findAll();
  }

  /**
   * DELETE /bookings/:id
   * Cancel a booking by ID. Returns 404 if not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(id);
  }
}