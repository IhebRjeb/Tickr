import { DomainEvent } from '@shared/domain/domain-event.base';

export class OrderExpiredEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly eventId: string,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      userId: this.userId,
      eventId: this.eventId,
    };
  }
}
