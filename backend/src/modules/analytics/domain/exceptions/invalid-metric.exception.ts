import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Thrown when metric creation data is invalid.
 */
export class InvalidMetricException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_METRIC');
  }
}
