import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  ExpireTicketsCommand,
  type ExpireTicketsErrorCommand,
  type ExpireTicketsResultCommand,
} from './expire-tickets.command';

// Re-export types for external use
export type ExpireTicketsResult = ExpireTicketsResultCommand;
export type ExpireTicketsError = ExpireTicketsErrorCommand;

/**
 * Handler for ExpireTicketsCommand
 *
 * Expires all RESERVED tickets past their reservation TTL.
 * Designed for invocation by a scheduled cron job.
 *
 * Responsibilities:
 * 1. Find all expired reservations
 * 2. Expire each ticket
 * 3. Save all expired tickets
 * 4. Restore ticket type availability
 * 5. Publish domain events
 */
@Injectable()
export class ExpireTicketsHandler {
  private readonly logger = new Logger(ExpireTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    _command: ExpireTicketsCommand,
  ): Promise<Result<ExpireTicketsResult, ExpireTicketsError>> {
    this.logger.debug('Running ticket expiration check');

    // ============================================
    // 1. Find all expired reservations
    // ============================================
    const expiredTickets =
      await this.ticketRepository.findExpiredReservations();

    if (expiredTickets.length === 0) {
      this.logger.debug('No expired reservations found');
      return Result.ok({ expiredCount: 0 });
    }

    // ============================================
    // 2. Expire each ticket
    // ============================================
    const expired = [];
    for (const ticket of expiredTickets) {
      const result = ticket.expire();
      if (result.isSuccess) {
        expired.push(ticket);
      }
    }

    if (expired.length === 0) {
      return Result.ok({ expiredCount: 0 });
    }

    // ============================================
    // 3. Save all expired tickets
    // ============================================
    try {
      await this.ticketRepository.saveAll(expired);

      // ============================================
      // 4. Restore availability per ticket type
      // ============================================
      const countByType = new Map<string, number>();
      for (const ticket of expired) {
        const current = countByType.get(ticket.ticketTypeId) ?? 0;
        countByType.set(ticket.ticketTypeId, current + 1);
      }

      for (const [ticketTypeId, count] of countByType) {
        await this.eventQuery.incrementTicketTypeAvailability(
          ticketTypeId,
          count,
        );
      }

      // ============================================
      // 5. Publish domain events
      // ============================================
      for (const ticket of expired) {
        await this.eventPublisher.publishFromAggregate(ticket);
      }

      this.logger.log(`Expired ${expired.length} ticket reservation(s)`);

      return Result.ok({ expiredCount: expired.length });
    } catch (error) {
      this.logger.error(`Failed to expire tickets: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to expire tickets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
