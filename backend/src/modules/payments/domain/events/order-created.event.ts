import { DomainEvent } from '@shared/domain/domain-event.base';

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly eventId: string,
    public readonly subtotalAmount: number,
    public readonly platformFeeAmount: number,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly expiresAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      userId: this.userId,
      eventId: this.eventId,
      subtotalAmount: this.subtotalAmount,
      platformFeeAmount: this.platformFeeAmount,
      totalAmount: this.totalAmount,
      currency: this.currency,
      expiresAt: this.expiresAt.toISOString(),
    };
  }
}
