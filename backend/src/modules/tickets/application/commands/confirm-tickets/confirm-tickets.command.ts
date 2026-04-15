import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for ConfirmTickets operation
// ============================================

/**
 * Error types for ConfirmTickets operation
 */
export type ConfirmTicketsErrorCommand =
  | { type: 'TICKETS_NOT_FOUND'; message: string }
  | { type: 'CONFIRMATION_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for ConfirmTickets operation
 */
export interface ConfirmTicketsResultCommand {
  readonly confirmedIds: string[];
}

/**
 * Command to confirm tickets after successful payment
 *
 * Transitions tickets from RESERVED to CONFIRMED.
 * Called internally after payment processing.
 */
export class ConfirmTicketsCommand extends BaseCommand {
  constructor(
    /** IDs of tickets to confirm */
    public readonly ticketIds: string[],
    /** The payment order ID linking tickets to payment */
    public readonly orderId: string,
  ) {
    super();
    Object.freeze(this);
  }
}
