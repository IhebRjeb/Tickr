
import { Injectable, Logger } from '@nestjs/common';

import type {
  TicketReservationPort,
  TicketReservationResult,
} from '../../application/ports/ticket-reservation.port';

/**
 * Injection token for the ticket reservation dependency.
 * Will be provided by the Tickets module once implemented.
 */
export const TICKET_RESERVATION_IMPL = Symbol('TICKET_RESERVATION_IMPL');

/**
 * Ticket Reservation Adapter (Cross-module: Payments → Tickets)
 *
 * Anti-corruption layer that delegates ticket operations
 * to the Tickets bounded context.
 *
 * NOTE: Currently a stub — the Tickets module will provide the
 * actual implementation. This adapter is wired as a no-op placeholder
 * until the Tickets module is complete.
 */
@Injectable()
export class TicketReservationAdapter implements TicketReservationPort {
  private readonly logger = new Logger(TicketReservationAdapter.name);

  async reserveTickets(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    quantity: number,
    _holders: { name: string; email: string }[],
  ): Promise<TicketReservationResult> {
    this.logger.warn(
      `[STUB] Reserving ${quantity} tickets for event ${eventId}, type ${ticketTypeId}, user ${userId}`,
    );

    // Stub: return mock ticket IDs until Tickets module is wired
    const ticketIds = Array.from({ length: quantity }, (_, i) => `stub-ticket-${eventId}-${i}`);
    return {
      ticketIds,
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async confirmTickets(ticketIds: string[], orderId: string): Promise<void> {
    this.logger.warn(
      `[STUB] Confirming ${ticketIds.length} tickets for order ${orderId}`,
    );
  }

  async cancelReservations(ticketIds: string[]): Promise<void> {
    this.logger.warn(`[STUB] Cancelling ${ticketIds.length} ticket reservations`);
  }
}
