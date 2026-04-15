import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket cannot be confirmed
 */
export class TicketNotConfirmableException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_NOT_CONFIRMABLE');
  }

  static wrongStatus(currentStatus: string): TicketNotConfirmableException {
    return new TicketNotConfirmableException(
      `Ticket cannot be confirmed from ${currentStatus} status. Only RESERVED tickets can be confirmed.`,
    );
  }
}
