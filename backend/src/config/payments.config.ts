import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => ({
  commission: {
    /** Platform commission rate (0.06 = 6%) */
    rate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.06'),
    /** Minimum commission amount (in smallest currency unit) */
    minimumAmount: parseFloat(process.env.PLATFORM_COMMISSION_MIN || '0.5'),
  },
  order: {
    /** Order expiration in minutes */
    expirationMinutes: parseInt(process.env.ORDER_EXPIRATION_MINUTES || '15', 10),
    /** Maximum items per order */
    maxItems: parseInt(process.env.ORDER_MAX_ITEMS || '10', 10),
  },
  fraud: {
    /** Max orders per user per hour */
    maxOrdersPerHour: parseInt(process.env.MAX_ORDERS_PER_HOUR || '5', 10),
    /** Max tickets per user per event */
    maxTicketsPerEvent: parseInt(process.env.MAX_TICKETS_PER_EVENT || '10', 10),
    /** High-value order threshold (TND) */
    highValueThresholdTND: parseFloat(process.env.HIGH_VALUE_THRESHOLD_TND || '5000'),
    /** High-value order threshold (EUR) */
    highValueThresholdEUR: parseFloat(process.env.HIGH_VALUE_THRESHOLD_EUR || '2000'),
    /** High-value order threshold (USD) */
    highValueThresholdUSD: parseFloat(process.env.HIGH_VALUE_THRESHOLD_USD || '2000'),
  },
  retry: {
    /** Maximum payment attempts per order */
    maxAttempts: parseInt(process.env.MAX_PAYMENT_ATTEMPTS || '3', 10),
  },
}));
