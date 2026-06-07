/**
 * Notification Channel Enum
 *
 * Supported delivery channels:
 * - EMAIL: AWS SES email delivery
 * - SMS: AWS SNS SMS delivery (Tunisia +216)
 * - PUSH: Firebase Cloud Messaging (V2 - reserved)
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

/**
 * Channels currently supported for sending
 */
const SUPPORTED_CHANNELS: ReadonlySet<NotificationChannel> = new Set([
  NotificationChannel.EMAIL,
  NotificationChannel.SMS,
]);

/**
 * Check if a channel is currently supported
 */
export function isSupportedChannel(channel: NotificationChannel): boolean {
  return SUPPORTED_CHANNELS.has(channel);
}
