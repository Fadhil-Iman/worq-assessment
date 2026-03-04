import { ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'Room' })
    roomName: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'Dil' })
    memberName: string;

    @IsDateString({}, { message: 'startTime must be a valid ISO 8601 date string' })
    @ApiProperty({ example: '2025-06-01T09:00:00Z' })
    startTime: string;

    @IsDateString({}, { message: 'endTime must be a valid ISO 8601 date string' })
    @ApiProperty({ example: '2025-06-01T10:00:00Z' })
    endTime: string;
}