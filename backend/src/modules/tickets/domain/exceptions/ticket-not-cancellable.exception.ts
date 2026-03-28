import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket cannot be cancelled
 */
export class TicketNotCancellableException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_NOT_CANCELLABLE');
  }

  static wrongStatus(currentStatus: string): TicketNotCancellableException {
    return new TicketNotCancellableException(
      `Ticket cannot be cancelled from ${currentStatus} status. Only RESERVED or CONFIRMED tickets can be cancelled.`,
    );
  }

  static alreadyCancelled(): TicketNotCancellableException {
    return new TicketNotCancellableException(
      'Ticket is already cancelled',
    );
  }
}
