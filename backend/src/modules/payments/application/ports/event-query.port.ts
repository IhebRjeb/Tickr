/**
 * Event Query Port (Cross-module — Events bounded context)
 *
 * Allows Payments module to query event/ticket-type data
 * without depending on Events domain internals.
 */
export const PAYMENT_EVENT_QUERY_PORT = Symbol('PAYMENT_EVENT_QUERY_PORT');

// Re-export types for convenience
export type { PaymentEventInfo, PaymentTicketTypeInfo } from '../types/event-query.types';

import type { PaymentEventInfo } from '../types/event-query.types';
import type { PaymentTicketTypeInfo } from '../types/event-query.types';

export interface PaymentEventQueryPort {
  getEventById(eventId: string): Promise<PaymentEventInfo | null>;
  getTicketType(ticketTypeId: string): Promise<PaymentTicketTypeInfo | null>;
}
