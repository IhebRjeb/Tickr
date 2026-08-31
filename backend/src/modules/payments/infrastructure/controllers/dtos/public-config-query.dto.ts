import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class PublicConfigQueryDto {
  @ApiPropertyOptional({
    description: 'Event UUID used to resolve an event-specific commission rate',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}