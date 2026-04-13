import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsString, IsUUID, MinLength } from 'class-validator';

/**
 * Request DTO for cancelling tickets
 */
export class CancelTicketsDto {
  @ApiProperty({
    description: 'IDs of tickets to cancel',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
  })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  ticketIds!: string[];

  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Changed plans',
  })
  @IsString()
  @MinLength(1)
  reason!: string;
}
