/**
 * Refund Status Value Object
 *
 * Tracks the lifecycle of a refund request.
 */
export enum RefundStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
