import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for CancelTickets operation
// ============================================

/**
 * Error types for CancelTickets operation
 */
export type CancelTicketsErrorCommand =
  | { type: 'TICKETS_NOT_FOUND'; message: string }
  | { type: 'CANCELLATION_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Command to cancel one or more tickets
 *
 * Can cancel RESERVED or CONFIRMED tickets.
 * If confirmed, a TicketCancelledEvent is emitted for refund processing.
 */
export class CancelTicketsCommand extends BaseCommand {
  constructor(
    /** IDs of tickets to cancel */
    public readonly ticketIds: string[],
    /** Reason for cancellation */
    public readonly reason: string,
  ) {
    super();
    Object.freeze(this);
  }
}
