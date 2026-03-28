import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a reserved ticket expires without payment
 */
export class TicketExpiredEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly ticketTypeId: string,
    public readonly userId: string,
    public readonly reservedUntil: Date,
  ) {
    super();
  }
}
