import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket cannot be checked in
 */
export class TicketNotCheckableInException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_NOT_CHECKABLE_IN');
  }

  static wrongStatus(currentStatus: string): TicketNotCheckableInException {
    return new TicketNotCheckableInException(
      `Ticket cannot be checked in from ${currentStatus} status. Only CONFIRMED tickets can be checked in.`,
    );
  }

  static alreadyCheckedIn(checkedInAt: Date): TicketNotCheckableInException {
    return new TicketNotCheckableInException(
      `Ticket was already checked in at ${checkedInAt.toISOString()}`,
    );
  }
}
