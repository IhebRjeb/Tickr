import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TicketStatus } from '../../domain/value-objects/ticket-status.vo';

/**
 * Response DTO for ticket list views
 *
 * Contains essential ticket fields. Used in paginated list responses.
 */
export class TicketDto {
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
    description: 'URL to download the PDF ticket',
    example: 'https://s3.example.com/tickets/abc123.pdf',
    nullable: true,
  })
  pdfUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the ticket was checked in',
    example: '2026-07-15T19:30:00Z',
    nullable: true,
  })
  checkedInAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Reservation expiry time',
    example: '2026-03-28T15:15:00Z',
    nullable: true,
  })
  reservedUntil!: Date | null;

  @ApiProperty({
    description: 'Ticket creation timestamp',
    example: '2026-03-28T15:00:00Z',
  })
  createdAt!: Date;
}

/**
 * Paginated ticket list response
 */
export class PaginatedTicketListDto {
  @ApiProperty({
    description: 'List of tickets',
    type: [TicketDto],
  })
  data!: TicketDto[];

  @ApiProperty({ description: 'Total matching tickets', example: 42 })
  total!: number;

  @ApiProperty({ description: 'Current page (1-based)', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total pages', example: 3 })
  totalPages!: number;

  @ApiProperty({ description: 'Whether a next page exists', example: true })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPreviousPage!: boolean;
}
