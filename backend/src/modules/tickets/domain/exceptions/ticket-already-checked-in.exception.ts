import { DomainException } from '@shared/domain/domain-exception.base';

export class TicketAlreadyCheckedInException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_ALREADY_CHECKED_IN');
  }

  static withTimestamp(
    ticketId: string,
    checkedInAt: Date,
  ): TicketAlreadyCheckedInException {
    return new TicketAlreadyCheckedInException(
      `Ticket ${ticketId} was already checked in at ${checkedInAt.toISOString()}`,
    );
  }

  static duplicateAttempt(ticketId: string): TicketAlreadyCheckedInException {
    return new TicketAlreadyCheckedInException(
      `Duplicate check-in attempt for ticket ${ticketId}`,
    );
  }
}
