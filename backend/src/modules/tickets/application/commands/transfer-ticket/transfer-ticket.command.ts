import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for TransferTicket operation
// ============================================

/**
 * Error types for TransferTicket operation
 */
export type TransferTicketErrorCommand =
  | { type: 'TICKET_NOT_FOUND'; message: string }
  | { type: 'NOT_TICKET_OWNER'; message: string }
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'TRANSFER_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for TransferTicket operation
 */
export interface TransferTicketResultCommand {
  readonly newQrCode: string;
}

/**
 * Command to transfer a ticket to another user
 *
 * Generates a new QR code and assigns the ticket to the new owner.
 * Limited to 3 transfers per ticket.
 */
export class TransferTicketCommand extends BaseCommand {
  constructor(
    /** ID of the ticket to transfer */
    public readonly ticketId: string,
    /** Current owner's user ID (for authorization) */
    public readonly currentOwnerId: string,
    /** Email of the new owner */
    public readonly newOwnerEmail: string,
  ) {
    super();
    Object.freeze(this);
  }
}
