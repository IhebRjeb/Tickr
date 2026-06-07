/**
 * Notification Type Enum
 *
 * Categorizes the purpose of each notification:
 * - ORDER_CONFIRMATION: Sent after successful ticket purchase
 * - PASSWORD_RESET: Password reset link
 * - EVENT_REMINDER: 24h before event reminder
 * - MARKETING_PROMO: Promotional offers (opt-in required)
 * - ACCOUNT_UPDATE: Account changes (email, profile)
 * - SECURITY_ALERT: Login from new device, password changed
 * - EVENT_CANCELLED: Event cancellation + refund info
 * - TICKET_CONFIRMED: Ticket confirmation with QR code
 * - WELCOME: New user welcome email
 */
export enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EVENT_REMINDER = 'EVENT_REMINDER',
  MARKETING_PROMO = 'MARKETING_PROMO',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  SECURITY_ALERT = 'SECURITY_ALERT',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  TICKET_CONFIRMED = 'TICKET_CONFIRMED',
  WELCOME = 'WELCOME',
}

/**
 * Transactional types that cannot be unsubscribed from
 */
const TRANSACTIONAL_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.ORDER_CONFIRMATION,
  NotificationType.PASSWORD_RESET,
  NotificationType.ACCOUNT_UPDATE,
  NotificationType.SECURITY_ALERT,
  NotificationType.TICKET_CONFIRMED,
  NotificationType.WELCOME,
]);

/**
 * Marketing types that require explicit opt-in
 */
const MARKETING_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.MARKETING_PROMO,
]);

/**
 * Reminder types that can be unsubscribed from
 */
const REMINDER_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.EVENT_REMINDER,
  NotificationType.EVENT_CANCELLED,
]);

/**
 * Check if a notification type is transactional (cannot unsubscribe)
 */
export function isTransactionalType(type: NotificationType): boolean {
  return TRANSACTIONAL_TYPES.has(type);
}

/**
 * Check if a notification type is marketing (requires opt-in)
 */
export function isMarketingType(type: NotificationType): boolean {
  return MARKETING_TYPES.has(type);
}

/**
 * Check if a notification type is a reminder (can unsubscribe)
 */
export function isReminderType(type: NotificationType): boolean {
  return REMINDER_TYPES.has(type);
}
