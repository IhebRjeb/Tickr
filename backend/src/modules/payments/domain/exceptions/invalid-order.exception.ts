import { DomainException } from '@shared/domain/domain-exception.base';

export class InvalidOrderException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_ORDER');
  }

  static invalidUserId(): InvalidOrderException {
    return new InvalidOrderException('User ID must be a valid UUID');
  }

  static invalidEventId(): InvalidOrderException {
    return new InvalidOrderException('Event ID must be a valid UUID');
  }

  static noItems(): InvalidOrderException {
    return new InvalidOrderException('Order must have at least 1 item');
  }

  static tooManyItems(max: number): InvalidOrderException {
    return new InvalidOrderException(`Order cannot have more than ${max} items`);
  }

  static invalidCurrency(currency: string): InvalidOrderException {
    return new InvalidOrderException(`Invalid currency: ${currency}`);
  }
}
