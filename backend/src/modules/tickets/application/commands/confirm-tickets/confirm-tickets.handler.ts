import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  ConfirmTicketsCommand,
  type ConfirmTicketsErrorCommand,
  type ConfirmTicketsResultCommand,
} from './confirm-tickets.command';

// Re-export types for external use
export type ConfirmTicketsResult = ConfirmTicketsResultCommand;
export type ConfirmTicketsError = ConfirmTicketsErrorCommand;

/**
 * Handler for ConfirmTicketsCommand
 *
 * Transitions tickets from RESERVED to CONFIRMED after payment.
 *
 * Responsibilities:
 * 1. Load all tickets by IDs
 * 2. Confirm each ticket with the order ID
 * 3. Collect errors for tickets that cannot be confirmed
 * 4. Save all successfully confirmed tickets
 * 5. Publish domain events
 */
@Injectable()
export class ConfirmTicketsHandler {
  private readonly logger = new Logger(ConfirmTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: ConfirmTicketsCommand,
  ): Promise<Result<ConfirmTicketsResult, ConfirmTicketsError>> {
    this.logger.debug(
      `Confirming ${command.ticketIds.length} ticket(s) for order ${command.orderId}`,
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
    // 2. Confirm each ticket
    // ============================================
    const errors: string[] = [];
    const confirmed = [];

    for (const ticket of tickets) {
      const result = ticket!.confirm(command.orderId);
      if (result.isFailure) {
        errors.push(`Ticket ${ticket!.id}: ${result.error.message}`);
      } else {
        confirmed.push(ticket!);
      }
    }

    if (errors.length > 0 && confirmed.length === 0) {
      return Result.fail({
        type: 'CONFIRMATION_FAILED',
        message: errors.join('; '),
      });
    }

    // ============================================
    // 3. Save confirmed tickets
    // ============================================
    try {
      await this.ticketRepository.saveAll(confirmed);

      // ============================================
      // 4. Publish domain events
      // ============================================
      for (const ticket of confirmed) {
        await this.eventPublisher.publishFromAggregate(ticket);
      }

      const confirmedIds = confirmed.map((t) => t.id);
      this.logger.log(
        `Confirmed ${confirmedIds.length} ticket(s) for order ${command.orderId}`,
      );

      return Result.ok({ confirmedIds });
    } catch (error) {
      this.logger.error(`Failed to save confirmed tickets: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to confirm tickets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
