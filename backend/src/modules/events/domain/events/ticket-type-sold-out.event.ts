import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Domain Event: TicketTypeSoldOut
 *
 * Published when a ticket type becomes sold out.
 * This event can be used to:
 * - Notify the organizer
 * - Update event capacity metrics
 * - Trigger waitlist notifications (future)
 */
export class TicketTypeSoldOutEvent extends DomainEvent {
  constructor(
    public readonly ticketTypeId: string,
    public readonly eventId: string,
    public readonly ticketTypeName: string,
    public readonly totalQuantity: number,
  ) {
    super();
  }

  /**
   * Get event data for serialization
   */
  protected getData(): Record<string, unknown> {
    return {
      ticketTypeId: this.ticketTypeId,
      eventId: this.eventId,
      ticketTypeName: this.ticketTypeName,
      totalQuantity: this.totalQuantity,
    };
  }
}
