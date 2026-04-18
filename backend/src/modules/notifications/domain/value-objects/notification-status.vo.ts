/**
 * Notification Status Enum
 *
 * Represents the lifecycle states of a notification:
 * - PENDING: Queued for sending
 * - SENDING: Currently being dispatched to provider
 * - SENT: Successfully sent to provider (awaiting delivery confirmation)
 * - DELIVERED: Confirmed delivery to recipient
 * - FAILED: Delivery failed (may retry)
 *
 * Valid transitions:
 *   PENDING   → SENDING | FAILED
 *   SENDING   → SENT | FAILED
 *   SENT      → DELIVERED | FAILED
 *   DELIVERED → (terminal)
 *   FAILED    → PENDING (retry)
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

/**
 * Valid state transitions for the notification lifecycle
 */
const VALID_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  [NotificationStatus.PENDING]: [
    NotificationStatus.SENDING,
    NotificationStatus.FAILED,
  ],
  [NotificationStatus.SENDING]: [
    NotificationStatus.SENT,
    NotificationStatus.FAILED,
  ],
  [NotificationStatus.SENT]: [
    NotificationStatus.DELIVERED,
    NotificationStatus.FAILED,
  ],
  [NotificationStatus.DELIVERED]: [],
  [NotificationStatus.FAILED]: [
    NotificationStatus.PENDING, // retry
  ],
};

/**
 * Terminal states that cannot transition further (except FAILED which can retry)
 */
const TERMINAL_STATES: ReadonlySet<NotificationStatus> = new Set([
  NotificationStatus.DELIVERED,
]);

/**
 * Check if a status transition is valid
 */
export function isValidNotificationTransition(
  from: NotificationStatus,
  to: NotificationStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalNotificationStatus(
  status: NotificationStatus,
): boolean {
  return TERMINAL_STATES.has(status);
}
