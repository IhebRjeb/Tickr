/**
 * Payment Status Value Object
 *
 * Tracks the status of individual payment attempts.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
