/**
 * Injection token for RateLimiter
 */
export const RATE_LIMITER = Symbol('RATE_LIMITER');

/**
 * Rate Limiter Port
 *
 * Defines the contract for notification rate limiting.
 * Implementation: Redis-based rate limiter in infrastructure layer.
 */
export interface RateLimiterPort {
  /**
   * Check if sending is allowed for a user
   */
  isAllowed(userId: string): Promise<boolean>;

  /**
   * Check if global email rate limit allows sending
   */
  isEmailAllowed(): Promise<boolean>;

  /**
   * Check if global SMS rate limit allows sending
   */
  isSmsAllowed(): Promise<boolean>;

  /**
   * Record a notification sent for a user
   */
  record(userId: string): Promise<void>;

  /**
   * Record a global email sent
   */
  recordEmail(): Promise<void>;

  /**
   * Record a global SMS sent
   */
  recordSms(): Promise<void>;
}
