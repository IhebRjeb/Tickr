import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for ReserveTickets operation
// ============================================

/**
 * Holder data for ticket reservation
 * @internal
 */
interface TicketHolderData {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
}

/**
 * Error types for ReserveTickets operation
 */
export type ReserveTicketsErrorCommand =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'EVENT_NOT_PUBLISHED'; message: string }
  | { type: 'TICKET_TYPE_NOT_FOUND'; message: string }
  | { type: 'INSUFFICIENT_AVAILABILITY'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for ReserveTickets operation
 */
export interface ReserveTicketsResultCommand {
  readonly ticketIds: string[];
  readonly reservedUntil: Date;
}

/**
 * Command to reserve tickets for an event
 *
 * Creates one ticket per holder with a 15-minute TTL.
 * All validation is performed in the handler.
 */
export class ReserveTicketsCommand extends BaseCommand {
  constructor(
    /** The event to reserve tickets for */
    public readonly eventId: string,
    /** The ticket type (determines price and availability) */
    public readonly ticketTypeId: string,
    /** The user making the reservation */
    public readonly userId: string,
    /** One entry per ticket to reserve */
    public readonly holders: TicketHolderData[],
  ) {
    super();
    Object.freeze(this);
  }
}
