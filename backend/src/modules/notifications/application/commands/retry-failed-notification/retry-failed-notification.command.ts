import { BaseCommand } from '@shared/application/interfaces/command.interface';

/**
 * Error types for RetryFailedNotification operation
 */
export type RetryFailedNotificationError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'NOT_RETRYABLE'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for RetryFailedNotification operation
 */
export interface RetryFailedNotificationResultCommand {
  readonly notificationId: string;
  readonly retryCount: number;
  readonly nextRetryAt: Date;
}

/**
 * Command to retry a failed notification
 */
export class RetryFailedNotificationCommand extends BaseCommand {
  constructor(public readonly notificationId: string) {
    super();
    Object.freeze(this);
  }
}
