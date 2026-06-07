import { DomainEvent } from '@shared/domain/domain-event.base';

export class OrderPaidEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly eventId: string,
    public readonly transactionId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly platformFeeAmount: number,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      userId: this.userId,
      eventId: this.eventId,
      transactionId: this.transactionId,
      totalAmount: this.totalAmount,
      currency: this.currency,
      platformFeeAmount: this.platformFeeAmount,
    };
  }
}
