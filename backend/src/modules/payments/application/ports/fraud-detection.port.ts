/**
 * Fraud Detection Port
 *
 * Application layer interface for fraud checks.
 * Implementation lives in infrastructure (uses Redis for rate limiting).
 */
export const FRAUD_DETECTION_PORT = Symbol('FRAUD_DETECTION_PORT');

export interface FraudDetectionPort {
  /**
   * Check if user has exceeded order rate limit (max orders/hour)
   * @returns true if within limit, false if rate-limited
   */
  checkRateLimit(userId: string): Promise<boolean>;

  /**
   * Check if user has exceeded ticket limit per event
   * @returns true if within limit, false if exceeded
   */
  checkTicketLimit(userId: string, eventId: string, requestedQuantity: number): Promise<boolean>;

  /**
   * Check if order amount triggers high-value review
   * @returns true if order requires manual review
   */
  isHighValueOrder(totalAmount: number, currency: string): boolean;
}
