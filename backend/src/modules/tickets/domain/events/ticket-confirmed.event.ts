import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a reserved ticket is confirmed after payment
 */
export class TicketConfirmedEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly ticketTypeId: string,
    public readonly orderId: string,
    public readonly userId: string,
  ) {
    super();
  }
}
