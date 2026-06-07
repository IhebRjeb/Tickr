import { registerAs } from '@nestjs/config';

/**
 * Notification Configuration
 *
 * Rate limits, retry settings, and notification-specific config.
 *
 * Environment Variables:
 * - NOTIFICATION_RATE_LIMIT_USER: Max notifications per user per hour (default: 20)
 * - NOTIFICATION_RATE_LIMIT_EMAIL_SEC: Max emails per second system-wide (default: 50)
 * - NOTIFICATION_RATE_LIMIT_SMS_MIN: Max SMS per minute system-wide (default: 100)
 * - NOTIFICATION_MAX_RETRIES: Max retry attempts for failed notifications (default: 3)
 * - NOTIFICATION_SCHEDULER_INTERVAL_MS: Scheduler cron interval in ms (default: 300000 = 5min)
 */
export default registerAs('notification', () => ({
  rateLimit: {
    userPerHour: parseInt(
      process.env.NOTIFICATION_RATE_LIMIT_USER || '20',
      10,
    ),
    emailPerSecond: parseInt(
      process.env.NOTIFICATION_RATE_LIMIT_EMAIL_SEC || '50',
      10,
    ),
    smsPerMinute: parseInt(
      process.env.NOTIFICATION_RATE_LIMIT_SMS_MIN || '100',
      10,
    ),
  },
  retry: {
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
    intervals: [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000], // 5min, 30min, 2h
  },
  scheduler: {
    intervalMs: parseInt(
      process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS || '300000',
      10,
    ),
  },
}));

/**
 * Notification Config Type for type safety
 */
export interface NotificationConfig {
  rateLimit: {
    userPerHour: number;
    emailPerSecond: number;
    smsPerMinute: number;
  };
  retry: {
    maxRetries: number;
    intervals: number[];
  };
  scheduler: {
    intervalMs: number;
  };
}
