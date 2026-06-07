import { DomainEvent } from '@shared/domain/domain-event.base';

export class OrderRefundedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly eventId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly reason: string,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      userId: this.userId,
      eventId: this.eventId,
      amount: this.amount,
      currency: this.currency,
      reason: this.reason,
    };
  }
}
