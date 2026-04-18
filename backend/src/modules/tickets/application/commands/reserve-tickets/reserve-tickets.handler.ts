import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { Money } from '@shared/domain/value-objects/money.vo';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { TicketEntity } from '../../../domain/entities/ticket.entity';
import { QRCodeVO } from '../../../domain/value-objects/qr-code.vo';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  ReserveTicketsCommand,
  type ReserveTicketsErrorCommand,
  type ReserveTicketsResultCommand,
} from './reserve-tickets.command';

// Re-export types for external use
export type ReserveTicketsResult = ReserveTicketsResultCommand;
export type ReserveTicketsError = ReserveTicketsErrorCommand;

const RESERVATION_TTL_MINUTES = 15;

/**
 * Handler for ReserveTicketsCommand
 *
 * Creates ticket reservations with a 15-minute TTL.
 *
 * Responsibilities:
 * 1. Validate event exists and is PUBLISHED
 * 2. Validate ticket type exists and has availability
 * 3. Decrement availability atomically
 * 4. Create one TicketEntity per holder
 * 5. Save all tickets
 * 6. Publish domain events
 */
@Injectable()
export class ReserveTicketsHandler {
  private readonly logger = new Logger(ReserveTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(
    command: ReserveTicketsCommand,
  ): Promise<Result<ReserveTicketsResult, ReserveTicketsError>> {
    this.logger.debug(
      `Reserving ${command.holders.length} ticket(s) for event ${command.eventId}`,
    );

    // ============================================
    // 1. Validate event exists and is published
    // ============================================
    const event = await this.eventQuery.getEventById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event '${command.eventId}' not found`,
      });
    }

    if (event.status !== 'PUBLISHED') {
      return Result.fail({
        type: 'EVENT_NOT_PUBLISHED',
        message: `Event '${command.eventId}' is not published (status: ${event.status})`,
      });
    }

    // ============================================
    // 2. Validate ticket type and availability
    // ============================================
    const ticketType = await this.eventQuery.getTicketTypeAvailability(
      command.ticketTypeId,
    );
    if (!ticketType) {
      return Result.fail({
        type: 'TICKET_TYPE_NOT_FOUND',
        message: `Ticket type '${command.ticketTypeId}' not found`,
      });
    }

    if (ticketType.available < command.holders.length) {
      return Result.fail({
        type: 'INSUFFICIENT_AVAILABILITY',
        message: `Only ${ticketType.available} ticket(s) available, requested ${command.holders.length}`,
      });
    }

    // ============================================
    // 3. Decrement availability atomically
    // ============================================
    const decremented = await this.eventQuery.decrementTicketTypeAvailability(
      command.ticketTypeId,
      command.holders.length,
    );
    if (!decremented) {
      return Result.fail({
        type: 'INSUFFICIENT_AVAILABILITY',
        message: 'Tickets became unavailable during reservation',
      });
    }

    // ============================================
    // 4. Create tickets for each holder
    // ============================================
    const reservedUntil = new Date(
      Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
    );
    const price = Money.create(ticketType.price, ticketType.currency);
    const tickets: TicketEntity[] = [];

    for (const holder of command.holders) {
      const qrCode = QRCodeVO.generate();
      const ticketResult = TicketEntity.createReservation({
        eventId: command.eventId,
        ticketTypeId: command.ticketTypeId,
        userId: command.userId,
        qrCode,
        price,
        holderName: holder.name,
        holderEmail: holder.email,
        holderPhone: holder.phone,
        reservedUntil,
      });

      if (ticketResult.isFailure) {
        // Roll back availability
        await this.eventQuery.incrementTicketTypeAvailability(
          command.ticketTypeId,
          command.holders.length,
        );
        return Result.fail({
          type: 'VALIDATION_ERROR',
          message: ticketResult.error.message,
        });
      }

      tickets.push(ticketResult.value);
    }

    // ============================================
    // 5. Save all tickets
    // ============================================
    try {
      await this.ticketRepository.saveAll(tickets);

      // ============================================
      // 6. Publish domain events
      // ============================================
      for (const ticket of tickets) {
        await this.eventPublisher.publishFromAggregate(ticket);
      }

      const ticketIds = tickets.map((t) => t.id);
      this.logger.log(
        `Reserved ${ticketIds.length} ticket(s) for event ${command.eventId}`,
      );

      return Result.ok({ ticketIds, reservedUntil });
    } catch (error) {
      this.logger.error(`Failed to save reservations: ${error}`);
      // Roll back availability on persistence failure
      await this.eventQuery.incrementTicketTypeAvailability(
        command.ticketTypeId,
        command.holders.length,
      );
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to save reservations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
