import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  CancelTicketsCommand,
  type CancelTicketsErrorCommand,
} from './cancel-tickets.command';

// Re-export types for external use
export type CancelTicketsError = CancelTicketsErrorCommand;

/**
 * Handler for CancelTicketsCommand
 *
 * Cancels one or more tickets from RESERVED or CONFIRMED status.
 *
 * Responsibilities:
 * 1. Load all tickets by IDs
 * 2. Cancel each ticket with the reason
 * 3. Save all cancelled tickets
 * 4. Restore ticket type availability
 * 5. Publish domain events
 */
@Injectable()
export class CancelTicketsHandler {
  private readonly logger = new Logger(CancelTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: CancelTicketsCommand,
  ): Promise<Result<void, CancelTicketsError>> {
    this.logger.debug(
      `Cancelling ${command.ticketIds.length} ticket(s): ${command.reason}`,
    );

    // ============================================
    // 1. Load all tickets
    // ============================================
    const tickets = await Promise.all(
      command.ticketIds.map((id) => this.ticketRepository.findById(id)),
    );

    const missingIds = command.ticketIds.filter(
      (id, i) => tickets[i] === null,
    );
    if (missingIds.length > 0) {
      return Result.fail({
        type: 'TICKETS_NOT_FOUND',
        message: `Tickets not found: ${missingIds.join(', ')}`,
      });
    }

    // ============================================
    // 2. Cancel each ticket
    // ============================================
    const errors: string[] = [];
    const cancelled = [];

    for (const ticket of tickets) {
      const result = ticket!.cancel(command.reason);
      if (result.isFailure) {
        errors.push(`Ticket ${ticket!.id}: ${result.error.message}`);
      } else {
        cancelled.push(ticket!);
      }
    }

    if (errors.length > 0 && cancelled.length === 0) {
      return Result.fail({
        type: 'CANCELLATION_FAILED',
        message: errors.join('; '),
      });
    }

    // ============================================
    // 3. Save cancelled tickets
    // ============================================
    try {
      await this.ticketRepository.saveAll(cancelled);

      // ============================================
      // 4. Restore availability per ticket type
      // ============================================
      const countByType = new Map<string, number>();
      for (const ticket of cancelled) {
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
      for (const ticket of cancelled) {
        await this.eventPublisher.publishFromAggregate(ticket);
      }

      this.logger.log(`Cancelled ${cancelled.length} ticket(s)`);

      return Result.okVoid();
    } catch (error) {
      this.logger.error(`Failed to save cancelled tickets: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to cancel tickets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
