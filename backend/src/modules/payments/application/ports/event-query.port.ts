/**
 * Event Query Port (Cross-module — Events bounded context)
 *
 * Allows Payments module to query event/ticket-type data
 * without depending on Events domain internals.
 */
export const PAYMENT_EVENT_QUERY_PORT = Symbol('PAYMENT_EVENT_QUERY_PORT');

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

export interface PaymentEventQueryPort {
  getEventById(eventId: string): Promise<PaymentEventInfo | null>;
  getTicketType(ticketTypeId: string): Promise<PaymentTicketTypeInfo | null>;
}
