/**
 * Cross-module DTOs for Events bounded context queries
 *
 * These types define the data shapes returned by the EventQueryPort.
 * Kept in a model file to avoid naming convention conflicts in port files.
 */

/**
 * Minimal event info needed by the Tickets module
 */
export interface EventInfo {
  readonly id: string;
  readonly status: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * Ticket type availability info for reservation
 */
export interface TicketTypeAvailability {
  readonly available: number;
  readonly price: number;
  readonly currency: string;
  readonly name: string;
}
