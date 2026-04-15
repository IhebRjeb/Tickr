import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a ticket is reserved during checkout
 */
export class TicketReservedEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly ticketTypeId: string,
    public readonly userId: string,
    public readonly qrCode: string,
    public readonly priceAmount: number,
    public readonly priceCurrency: string,
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
      qrCode: this.qrCode,
      priceAmount: this.priceAmount,
      priceCurrency: this.priceCurrency,
      reservedUntil: this.reservedUntil.toISOString(),
    };
  }
}
