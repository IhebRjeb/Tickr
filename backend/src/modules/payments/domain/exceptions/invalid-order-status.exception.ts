import { DomainException } from '@shared/domain/domain-exception.base';

import { OrderStatus } from '../value-objects/order-status.vo';

export class InvalidOrderStatusException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_ORDER_STATUS');
  }

  static invalidTransition(from: OrderStatus, to: OrderStatus): InvalidOrderStatusException {
    return new InvalidOrderStatusException(
      `Cannot transition order from ${from} to ${to}`,
    );
  }

  static alreadyPaid(): InvalidOrderStatusException {
    return new InvalidOrderStatusException('Order is already paid');
  }

  static alreadyCancelled(): InvalidOrderStatusException {
    return new InvalidOrderStatusException('Order is already cancelled');
  }
}
