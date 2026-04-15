/**
 * Ticket Status Enum
 *
 * Represents the lifecycle states of a ticket:
 * - RESERVED: Ticket held during payment process (15 min TTL)
 * - CONFIRMED: Payment successful, QR code active
 * - CANCELLED: Payment failed, refunded, or user abandoned
 * - CHECKED_IN: Scanned at venue entrance
 * - EXPIRED: Reservation expired without payment
 *
 * Valid transitions:
 *   RESERVED  → CONFIRMED | CANCELLED | EXPIRED
 *   CONFIRMED → CHECKED_IN | CANCELLED
 *   CHECKED_IN → (terminal)
 *   CANCELLED  → (terminal)
 *   EXPIRED    → (terminal)
 */
export enum TicketStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
  EXPIRED = 'EXPIRED',
}

/**
 * Valid state transitions for the ticket lifecycle
 */
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.RESERVED]: [
    TicketStatus.CONFIRMED,
    TicketStatus.CANCELLED,
    TicketStatus.EXPIRED,
  ],
  [TicketStatus.CONFIRMED]: [
    TicketStatus.CHECKED_IN,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.CHECKED_IN]: [],
  [TicketStatus.CANCELLED]: [],
  [TicketStatus.EXPIRED]: [],
};

/**
 * Terminal states that cannot transition further
 */
const TERMINAL_STATES: ReadonlySet<TicketStatus> = new Set([
  TicketStatus.CHECKED_IN,
  TicketStatus.CANCELLED,
  TicketStatus.EXPIRED,
]);

/**
 * Check if a status transition is valid
 */
export function isValidTicketTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalTicketStatus(status: TicketStatus): boolean {
  return TERMINAL_STATES.has(status);
}
