import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENT_QUERY_PORT } from '../../application/ports/event-query.port';
import type { EventQueryPort } from '../../application/ports/event-query.port';
import { TicketCancelledEvent } from '../../domain/events/ticket-cancelled.event';

/**
 * Infrastructure handler for TicketCancelledEvent
 *
 * Performs infrastructure side effects after ticket cancellation:
 * 1. Release ticket type availability (increment available count)
 *
 * Future:
 * - Trigger refund via Payments module (if confirmed ticket)
 * - Send cancellation notification
 */
@Injectable()
export class TicketCancelledInfraHandler {
  private readonly logger = new Logger(TicketCancelledInfraHandler.name);

  constructor(
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  @OnEvent('TicketCancelledEvent')
  async handle(event: TicketCancelledEvent): Promise<void> {
    this.logger.log(
      `[Infra] Processing TicketCancelled: ${event.ticketId}`,
    );

    try {
      // Release ticket type availability back to the pool
      const released = await this.eventQuery.incrementTicketTypeAvailability(
        event.ticketTypeId,
        1,
      );

      if (released) {
        this.logger.log(
          `[Infra] Released 1 ticket back to ticket type ${event.ticketTypeId}`,
        );
      } else {
        this.logger.warn(
          `[Infra] Failed to release availability for ticket type ${event.ticketTypeId}`,
        );
      }

      // TODO: Trigger refund via Payments module if ticket was confirmed
      // if (event.wasConfirmed) {
      //   await this.paymentsService.initiateRefund(...)
      // }
    } catch (error) {
      this.logger.error(
        `[Infra] Failed to process TicketCancelled for ${event.ticketId}: ${error}`,
      );
    }
  }
}
