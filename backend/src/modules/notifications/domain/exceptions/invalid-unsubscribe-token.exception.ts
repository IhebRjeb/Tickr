import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when an unsubscribe token is invalid or not found
 */
export class InvalidUnsubscribeTokenException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_UNSUBSCRIBE_TOKEN');
  }

  static notFound(token: string): InvalidUnsubscribeTokenException {
    return new InvalidUnsubscribeTokenException(
      `Unsubscribe token not found: ${token}`,
    );
  }
}
