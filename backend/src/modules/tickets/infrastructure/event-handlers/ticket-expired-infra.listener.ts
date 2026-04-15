import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENT_QUERY_PORT } from '../../application/ports/event-query.port';
import type { EventQueryPort } from '../../application/ports/event-query.port';
import { TicketExpiredEvent } from '../../domain/events/ticket-expired.event';

/**
 * Infrastructure handler for TicketExpiredEvent
 *
 * Performs infrastructure side effects after ticket expiration:
 * 1. Release ticket type availability (increment available count)
 *
 * Future:
 * - Send expiration notification to user
 * - Track expiration analytics for conversion rate analysis
 */
@Injectable()
export class TicketExpiredInfraHandler {
  private readonly logger = new Logger(TicketExpiredInfraHandler.name);

  constructor(
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  @OnEvent('TicketExpiredEvent')
  async handle(event: TicketExpiredEvent): Promise<void> {
    this.logger.log(
      `[Infra] Processing TicketExpired: ${event.ticketId}`,
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
    } catch (error) {
      this.logger.error(
        `[Infra] Failed to process TicketExpired for ${event.ticketId}: ${error}`,
      );
    }
  }
}
