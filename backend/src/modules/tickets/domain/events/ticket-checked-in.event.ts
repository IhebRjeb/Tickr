import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a ticket is successfully checked in at the venue
 */
export class TicketCheckedInEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly staffId: string,
    public readonly locationGate: string,
    public readonly checkedInAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      ticketId: this.ticketId,
      eventId: this.eventId,
      staffId: this.staffId,
      locationGate: this.locationGate,
      checkedInAt: this.checkedInAt.toISOString(),
    };
  }
}
