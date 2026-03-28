import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsUUID } from 'class-validator';

/**
 * Request DTO for confirming tickets after payment
 */
export class ConfirmTicketsDto {
  @ApiProperty({
    description: 'IDs of tickets to confirm',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
  })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  ticketIds!: string[];

  @ApiProperty({
    description: 'Payment order ID linking tickets to payment',
    example: '550e8400-e29b-41d4-a716-446655440020',
  })
  @IsUUID()
  orderId!: string;
}

/**
 * Response DTO for ticket confirmation
 */
export class ConfirmTicketsResponseDto {
  @ApiProperty({
    description: 'IDs of confirmed tickets',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
  })
  confirmedIds!: string[];
}
