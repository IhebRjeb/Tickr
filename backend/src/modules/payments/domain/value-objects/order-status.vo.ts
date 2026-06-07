/**
 * Order Status Value Object
 *
 * Defines the lifecycle states for an Order aggregate.
 *
 * State Machine:
 *   PENDING → PROCESSING → PAID
 *   PENDING → PROCESSING → FAILED
 *   PENDING → CANCELLED (user or expiration)
 *   PROCESSING → CANCELLED
 *   PAID → REFUNDED
 *
 * Terminal states: PAID, FAILED, CANCELLED, REFUNDED
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Valid state transitions map
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.REFUNDED],
  [OrderStatus.FAILED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Check if an order status is terminal (no further transitions possible)
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Get allowed transitions from a given status
 */
export function getAllowedTransitions(status: OrderStatus): OrderStatus[] {
  return [...VALID_TRANSITIONS[status]];
}
