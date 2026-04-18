import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import type { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import type { NotificationType } from '../../../domain/value-objects/notification-type.vo';

// ============================================
// Types for SendNotification operation
// ============================================

/**
 * Error types for SendNotification operation
 */
export type SendNotificationError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'USER_OPTED_OUT'; message: string }
  | { type: 'RATE_LIMIT_EXCEEDED'; message: string }
  | { type: 'CHANNEL_UNAVAILABLE'; message: string }
  | { type: 'TEMPLATE_NOT_FOUND'; message: string }
  | { type: 'TEMPLATE_RENDERING_ERROR'; message: string }
  | { type: 'SEND_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for SendNotification operation
 */
export interface SendNotificationResult {
  readonly notificationId: string;
  readonly status: string;
}

/**
 * Recipient data for the notification
 */
interface RecipientData {
  readonly email?: string;
  readonly phone?: string;
}

/**
 * Command to send a notification
 *
 * Handles single notification dispatch through email or SMS.
 * The handler orchestrates validation, rate limiting, template rendering,
 * and provider dispatch.
 */
export class SendNotificationCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly recipient: RecipientData,
    public readonly subject: string | null,
    public readonly content: string | null,
    public readonly templateSlug: string | null,
    public readonly templateData: Record<string, unknown>,
    public readonly priority: NotificationPriority | null,
    public readonly scheduledFor: Date | null,
    public readonly metadata: Record<string, unknown>,
  ) {
    super();
    Object.freeze(this);
  }
}
