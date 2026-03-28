import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TicketStatus } from '../../domain/value-objects/ticket-status.vo';

/**
 * Detailed response DTO for a single ticket
 *
 * Includes all ticket fields plus transfer history.
 * Used for ticket detail page and owner views.
 */
export class TicketDetailDto {
  @ApiProperty({
    description: 'Unique ticket identifier',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  id!: string;

  @ApiProperty({
    description: 'Event this ticket is for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  eventId!: string;

  @ApiProperty({
    description: 'Ticket type identifier',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  ticketTypeId!: string;

  @ApiPropertyOptional({
    description: 'Payment order ID',
    example: '550e8400-e29b-41d4-a716-446655440020',
    nullable: true,
  })
  orderId!: string | null;

  @ApiProperty({
    description: 'Current owner user ID',
    example: '550e8400-e29b-41d4-a716-446655440030',
  })
  userId!: string;

  @ApiProperty({
    description: 'QR code string',
    example: 'v1-550e8400-e29b-41d4-a716-446655440000-a1b2',
  })
  qrCode!: string;

  @ApiProperty({
    description: 'Ticket lifecycle status',
    enum: TicketStatus,
    example: 'CONFIRMED',
  })
  status!: TicketStatus;

  @ApiProperty({
    description: 'Ticket price amount',
    example: 75.0,
  })
  priceAmount!: number;

  @ApiProperty({
    description: 'Ticket price currency',
    example: 'TND',
  })
  priceCurrency!: string;

  @ApiProperty({
    description: 'Name of the ticket holder',
    example: 'John Doe',
  })
  holderName!: string;

  @ApiProperty({
    description: 'Email of the ticket holder',
    example: 'john@example.com',
  })
  holderEmail!: string;

  @ApiPropertyOptional({
    description: 'Phone number of the ticket holder',
    example: '+21612345678',
    nullable: true,
  })
  holderPhone!: string | null;

  @ApiPropertyOptional({
    description: 'Check-in timestamp',
    example: '2026-07-15T19:30:00Z',
    nullable: true,
  })
  checkedInAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Staff member who processed check-in',
    example: '550e8400-e29b-41d4-a716-446655440040',
    nullable: true,
  })
  checkedInBy!: string | null;

  @ApiPropertyOptional({
    description: 'User ID of the transfer recipient',
    example: '550e8400-e29b-41d4-a716-446655440050',
    nullable: true,
  })
  transferredTo!: string | null;

  @ApiPropertyOptional({
    description: 'Transfer timestamp',
    example: '2026-03-30T10:00:00Z',
    nullable: true,
  })
  transferredAt!: Date | null;

  @ApiProperty({
    description: 'Number of times ticket has been transferred',
    example: 1,
  })
  transferCount!: number;

  @ApiPropertyOptional({
    description: 'Reservation expiry time',
    example: '2026-03-28T15:15:00Z',
    nullable: true,
  })
  reservedUntil!: Date | null;

  @ApiPropertyOptional({
    description: 'URL to download the PDF ticket',
    example: 'https://s3.example.com/tickets/abc123.pdf',
    nullable: true,
  })
  pdfUrl!: string | null;

  @ApiProperty({
    description: 'Ticket creation timestamp',
    example: '2026-03-28T15:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-28T15:00:00Z',
  })
  updatedAt!: Date;
}
