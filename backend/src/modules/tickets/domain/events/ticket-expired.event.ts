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

  protected getData(): Record<string, unknown> {
    return {
      ticketId: this.ticketId,
      eventId: this.eventId,
      ticketTypeId: this.ticketTypeId,
      userId: this.userId,
      reservedUntil: this.reservedUntil.toISOString(),
    };
  }
}
