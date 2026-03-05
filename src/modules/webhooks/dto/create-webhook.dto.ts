import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class RegisterWebhookDto {
  @IsUrl({}, { message: 'url must be a valid URL' })
  @ApiProperty()
  url: string;
}