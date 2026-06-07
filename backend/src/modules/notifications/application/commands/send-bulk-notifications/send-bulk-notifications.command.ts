import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import type { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import type { NotificationType } from '../../../domain/value-objects/notification-type.vo';

/**
 * Single recipient in a bulk send
 */
interface BulkRecipient {
  readonly userId: string;
  readonly email?: string;
  readonly phone?: string;
  readonly templateData?: Record<string, unknown>;
}

/**
 * Error types for SendBulkNotifications operation
 */
export type SendBulkNotificationsError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PARTIAL_FAILURE'; message: string; sent: number; failed: number };

/**
 * Result type for SendBulkNotifications operation
 */
export interface SendBulkNotificationsResultCommand {
  readonly totalSent: number;
  readonly totalFailed: number;
  readonly notificationIds: string[];
}

/**
 * Command to send notifications to multiple recipients
 */
export class SendBulkNotificationsCommand extends BaseCommand {
  constructor(
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly recipients: BulkRecipient[],
    public readonly subject: string | null,
    public readonly content: string | null,
    public readonly templateSlug: string | null,
    public readonly priority: NotificationPriority | null,
    public readonly metadata: Record<string, unknown>,
  ) {
    super();
    Object.freeze(this);
  }
}
