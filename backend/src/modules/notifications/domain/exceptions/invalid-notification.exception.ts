import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when notification creation validation fails
 */
export class InvalidNotificationException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_NOTIFICATION');
  }

  static missingUserId(): InvalidNotificationException {
    return new InvalidNotificationException('User ID is required');
  }

  static invalidUUID(fieldName: string): InvalidNotificationException {
    return new InvalidNotificationException(
      `${fieldName} must be a valid UUID`,
    );
  }

  static missingContent(): InvalidNotificationException {
    return new InvalidNotificationException(
      'Notification content is required',
    );
  }

  static missingRecipient(): InvalidNotificationException {
    return new InvalidNotificationException(
      'Notification recipient is required',
    );
  }

  static invalidType(type: string): InvalidNotificationException {
    return new InvalidNotificationException(
      `Invalid notification type: ${type}`,
    );
  }

  static invalidChannel(channel: string): InvalidNotificationException {
    return new InvalidNotificationException(
      `Invalid notification channel: ${channel}`,
    );
  }

  static invalidPriority(priority: string): InvalidNotificationException {
    return new InvalidNotificationException(
      `Invalid notification priority: ${priority}`,
    );
  }

  static subjectRequiredForEmail(): InvalidNotificationException {
    return new InvalidNotificationException(
      'Subject is required for email notifications',
    );
  }
}
