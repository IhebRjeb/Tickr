import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket cannot be expired
 */
export class TicketNotExpirableException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_NOT_EXPIRABLE');
  }

  static wrongStatus(currentStatus: string): TicketNotExpirableException {
    return new TicketNotExpirableException(
      `Ticket cannot be expired from ${currentStatus} status. Only RESERVED tickets can be expired.`,
    );
  }
}
