
import { TICKET_REPOSITORY } from '@modules/tickets/application/ports/ticket.repository.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { Injectable, Inject, Logger } from '@nestjs/common';

import type {
  TicketReservationPort,
  TicketReservationResult,
} from '../../application/ports/ticket-reservation.port';

/**
 * Ticket Reservation Adapter (Cross-module: Payments → Tickets)
 *
 * Anti-corruption layer that delegates ticket operations
 * to the Tickets bounded context.
 *
 * The Payments module uses this adapter to:
 * - Reserve tickets when an order is created
 * - Confirm tickets after payment success
 * - Cancel/release tickets on payment failure or expiration
 */
@Injectable()
export class TicketReservationAdapter implements TicketReservationPort {
  private readonly logger = new Logger(TicketReservationAdapter.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async reserveTickets(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    quantity: number,
    holders: { name: string; email: string }[],
  ): Promise<TicketReservationResult> {
    this.logger.debug(
      `Reserving ${quantity} tickets for event ${eventId}, type ${ticketTypeId}`,
    );

    // Delegate to tickets module repository
    const tickets = await this.ticketRepository.reserveForOrder(
      eventId,
      ticketTypeId,
      userId,
      quantity,
      holders,
    );

    return {
      ticketIds: tickets.map((t) => t.id),
      reservedUntil: tickets[0]?.reservedUntil ?? new Date(),
    };
  }

  async confirmTickets(ticketIds: string[], orderId: string): Promise<void> {
    this.logger.debug(
      `Confirming ${ticketIds.length} tickets for order ${orderId}`,
    );

    await this.ticketRepository.confirmByOrderId(ticketIds, orderId);
  }

  async cancelReservations(ticketIds: string[]): Promise<void> {
    this.logger.debug(`Cancelling ${ticketIds.length} ticket reservations`);

    await this.ticketRepository.cancelReservations(ticketIds);
  }
}
