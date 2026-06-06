import { DomainEvent } from '@shared/domain/domain-event.base';

export class OrderProcessingEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly paymentMethod: string,
    public readonly gatewayRef: string,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      userId: this.userId,
      paymentMethod: this.paymentMethod,
      gatewayRef: this.gatewayRef,
    };
  }
}
