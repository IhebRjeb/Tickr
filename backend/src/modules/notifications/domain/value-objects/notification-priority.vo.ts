/**
 * Notification Priority Enum
 *
 * Determines sending urgency and rate limit behavior:
 * - HIGH: Critical notifications (password reset, security alerts) — bypasses user rate limits
 * - MEDIUM: Standard notifications (order confirmations, reminders)
 * - LOW: Non-urgent notifications (marketing, promotions)
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Check if a priority can bypass user rate limits
 */
export function canBypassRateLimit(priority: NotificationPriority): boolean {
  return priority === NotificationPriority.HIGH;
}
