import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a ticket is cancelled (refund may be initiated)
 */
export class TicketCancelledEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly ticketTypeId: string,
    public readonly userId: string,
    public readonly reason: string,
    public readonly priceAmount: number,
    public readonly priceCurrency: string,
    public readonly wasConfirmed: boolean,
  ) {
    super();
  }
}
