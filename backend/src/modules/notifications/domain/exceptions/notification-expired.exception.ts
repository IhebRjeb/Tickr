import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a notification has passed its scheduled window
 */
export class NotificationExpiredException extends DomainException {
  constructor(message: string) {
    super(message, 'NOTIFICATION_EXPIRED');
  }

  static pastSchedule(
    notificationId: string,
    scheduledFor: Date,
  ): NotificationExpiredException {
    return new NotificationExpiredException(
      `Notification ${notificationId} was scheduled for ${scheduledFor.toISOString()} and has expired`,
    );
  }
}
