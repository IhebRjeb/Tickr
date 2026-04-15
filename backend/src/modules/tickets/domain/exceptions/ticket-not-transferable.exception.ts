import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket cannot be transferred
 */
export class TicketNotTransferableException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_NOT_TRANSFERABLE');
  }

  static wrongStatus(currentStatus: string): TicketNotTransferableException {
    return new TicketNotTransferableException(
      `Ticket cannot be transferred from ${currentStatus} status. Only CONFIRMED tickets can be transferred.`,
    );
  }

  static maxTransfersReached(limit: number): TicketNotTransferableException {
    return new TicketNotTransferableException(
      `Ticket has reached the maximum number of transfers (${limit})`,
    );
  }

  static alreadyCheckedIn(): TicketNotTransferableException {
    return new TicketNotTransferableException(
      'Ticket cannot be transferred after check-in',
    );
  }
}
