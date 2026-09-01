import { ApiProperty } from '@nestjs/swagger';

/**
 * Per-ticket-type stats breakdown
 */
export class TicketTypeStatsDto {
  @ApiProperty({
    description: 'Ticket type name',
    example: 'VIP Access',
  })
  ticketTypeName!: string;

  @ApiProperty({
    description: 'Total tickets sold of this type',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Number checked in of this type',
    example: 65,
  })
  checkedIn!: number;

  @ApiProperty({
    description: 'Check-in rate percentage (0-100)',
    example: 65,
  })
  rate!: number;
}

/**
 * Response DTO for event check-in statistics
 *
 * Aggregates check-in data across all ticket types for an event.
 * Used by organizers to monitor venue entry progress.
 */
export class CheckInStatsDto {
  @ApiProperty({
    description: 'Total confirmed tickets for the event',
    example: 500,
  })
  totalTickets!: number;

  @ApiProperty({
    description: 'Number of tickets checked in',
    example: 320,
  })
  checkedIn!: number;

  @ApiProperty({
    description: 'Confirmed tickets still waiting to check in',
    example: 180,
  })
  remaining!: number;

  @ApiProperty({
    description: 'Overall check-in rate percentage (0-100)',
    example: 64,
  })
  checkInRate!: number;

  @ApiProperty({
    description: 'Per-ticket-type breakdown',
    type: [TicketTypeStatsDto],
  })
  byType!: TicketTypeStatsDto[];
}
