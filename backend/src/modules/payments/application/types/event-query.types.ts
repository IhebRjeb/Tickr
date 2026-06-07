/**
 * Event Query Types
 *
 * DTOs used by the Event Query port for cross-module communication.
 */

export interface PaymentEventInfo {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly startDate: Date;
  readonly organizerId: string;
}

export interface PaymentTicketTypeInfo {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly currency: string;
  readonly available: number;
}
