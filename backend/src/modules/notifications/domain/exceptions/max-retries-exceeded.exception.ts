import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when max retry attempts are exhausted
 */
export class MaxRetriesExceededException extends DomainException {
  constructor(message: string) {
    super(message, 'MAX_RETRIES_EXCEEDED');
  }

  static forNotification(
    notificationId: string,
    maxRetries: number,
  ): MaxRetriesExceededException {
    return new MaxRetriesExceededException(
      `Notification ${notificationId} has exceeded max retries (${maxRetries})`,
    );
  }
}
