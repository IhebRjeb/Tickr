import { DomainException } from '@shared/domain/domain-exception.base';

export class TicketExpiredException extends DomainException {
  constructor(message: string) {
    super(message, 'TICKET_EXPIRED');
  }

  static reservationExpired(
    ticketId: string,
    reservedUntil: Date,
  ): TicketExpiredException {
    return new TicketExpiredException(
      `Ticket ${ticketId} reservation expired at ${reservedUntil.toISOString()}`,
    );
  }

  static cannotOperate(
    ticketId: string,
    operation: string,
  ): TicketExpiredException {
    return new TicketExpiredException(
      `Cannot ${operation} ticket ${ticketId}: ticket has expired`,
    );
  }
}
