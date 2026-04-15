/**
 * Event Query Port
 *
 * Anti-corruption layer for querying the Events bounded context
 * from the Tickets module. Implementation in infrastructure layer
 * calls the Events module's repository directly.
 *
 * Design Decisions:
 * - Returns plain DTOs (not domain entities) to avoid coupling
 * - Includes availability management for ticket reservation flow
 */

import type {
  EventInfo,
  TicketTypeAvailability,
} from '../models/event-query.model';

// Re-export for convenience
export type { EventInfo, TicketTypeAvailability };

/**
 * Injection token for EventQueryPort
 */
export const EVENT_QUERY_PORT = Symbol('EVENT_QUERY_PORT');

export interface EventQueryPort {
  /**
   * Get event by ID (returns null if not found)
   */
  getEventById(eventId: string): Promise<EventInfo | null>;

  /**
   * Get ticket type availability (returns null if not found)
   */
  getTicketTypeAvailability(
    ticketTypeId: string,
  ): Promise<TicketTypeAvailability | null>;

  /**
   * Decrement available quantity after reservation
   * Returns false if insufficient availability
   */
  decrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean>;

  /**
   * Increment available quantity after cancellation/expiry
   */
  incrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean>;
}
