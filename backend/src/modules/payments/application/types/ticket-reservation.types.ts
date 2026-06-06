/**
 * Ticket Reservation Types
 *
 * DTOs used by the Ticket Reservation port.
 */

export interface TicketReservationResult {
  ticketIds: string[];
  reservedUntil: Date;
}
