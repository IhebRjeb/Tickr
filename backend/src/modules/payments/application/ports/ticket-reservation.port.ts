/**
 * Ticket Reservation Port (Cross-module — Tickets bounded context)
 *
 * Allows Payments module to reserve/confirm/cancel tickets
 * without depending on Tickets domain internals.
 */
export const TICKET_RESERVATION_PORT = Symbol('TICKET_RESERVATION_PORT');

// Re-export types for convenience
export type { TicketReservationResult } from '../types/ticket-reservation.types';

import type { TicketReservationResult } from '../types/ticket-reservation.types';

export interface TicketReservationPort {
  /**
   * Reserve tickets for an order (15-min hold)
   */
  reserveTickets(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    quantity: number,
    holders: { name: string; email: string }[],
  ): Promise<TicketReservationResult>;

  /**
   * Confirm reserved tickets after successful payment
   */
  confirmTickets(ticketIds: string[], orderId: string): Promise<void>;

  /**
   * Cancel/release ticket reservations (on payment failure or expiration)
   */
  cancelReservations(ticketIds: string[]): Promise<void>;
}
