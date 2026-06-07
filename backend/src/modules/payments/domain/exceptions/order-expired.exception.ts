import { DomainException } from '@shared/domain/domain-exception.base';

export class OrderExpiredException extends DomainException {
  constructor(message: string) {
    super(message, 'ORDER_EXPIRED');
  }

  static orderExpired(orderId: string): OrderExpiredException {
    return new OrderExpiredException(`Order ${orderId} has expired`);
  }

  static notYetExpired(orderId: string): OrderExpiredException {
    return new OrderExpiredException(`Order ${orderId} has not yet expired`);
  }
}
