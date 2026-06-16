import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Thrown when a time range is invalid (start >= end, exceeds max span).
 */
export class InvalidTimeRangeException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_TIME_RANGE');
  }
}
