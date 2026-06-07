import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a notification cannot be sent due to invalid status
 */
export class NotificationNotSendableException extends DomainException {
  constructor(message: string) {
    super(message, 'NOTIFICATION_NOT_SENDABLE');
  }

  static invalidStatus(
    currentStatus: string,
    targetStatus: string,
  ): NotificationNotSendableException {
    return new NotificationNotSendableException(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
    );
  }

  static alreadySent(notificationId: string): NotificationNotSendableException {
    return new NotificationNotSendableException(
      `Notification ${notificationId} has already been sent`,
    );
  }
}
