import {
  EVENT_REPOSITORY,
} from '@modules/events/application/ports/event.repository.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { TicketTypeOrmEntity } from '@modules/events/infrastructure/persistence/entities/ticket-type.orm-entity';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  EventQueryPort,
  EventInfo,
  TicketTypeAvailability,
} from '../../application/ports/event-query.port';

/**
 * Event Query Adapter
 *
 * Infrastructure adapter that implements the EventQueryPort.
 * Acts as an anti-corruption layer between Tickets and Events bounded contexts.
 *
 * Design Decisions:
 * - Uses the Events module's repository port for event queries
 * - Uses direct TypeORM access for ticket type availability (atomic updates)
 * - Maps Events domain entities to Tickets module query models
 */
@Injectable()
export class EventQueryAdapter implements EventQueryPort {
  private readonly logger = new Logger(EventQueryAdapter.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @InjectRepository(TicketTypeOrmEntity)
    private readonly ticketTypeOrmRepository: Repository<TicketTypeOrmEntity>,
  ) {}

  async getEventById(eventId: string): Promise<EventInfo | null> {
    this.logger.debug(`Querying event: ${eventId}`);

    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      return null;
    }

    return {
      id: event.id,
      status: event.status,
      startDate: event.dateRange.startDate,
      endDate: event.dateRange.endDate,
    };
  }

  async getTicketTypeAvailability(
    ticketTypeId: string,
  ): Promise<TicketTypeAvailability | null> {
    this.logger.debug(`Querying ticket type availability: ${ticketTypeId}`);

    const ticketType = await this.ticketTypeOrmRepository.findOne({
      where: { id: ticketTypeId },
    });

    if (!ticketType) {
      return null;
    }

    return {
      available: ticketType.quantity - ticketType.soldQuantity,
      price: Number(ticketType.priceAmount),
      currency: ticketType.priceCurrency,
      name: ticketType.name,
    };
  }

  async decrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    this.logger.debug(
      `Decrementing availability for ticket type ${ticketTypeId} by ${quantity}`,
    );

    // Atomic update: increment sold_quantity only if enough tickets remain
    const result = await this.ticketTypeOrmRepository
      .createQueryBuilder()
      .update(TicketTypeOrmEntity)
      .set({
        soldQuantity: () => 'sold_quantity + :qty',
      })
      .where('id = :id', { id: ticketTypeId })
      .andWhere('quantity - sold_quantity >= :qty', { qty: quantity })
      .execute();

    const success = (result.affected ?? 0) > 0;
    if (!success) {
      this.logger.warn(
        `Failed to decrement availability for ticket type ${ticketTypeId}: insufficient stock`,
      );
    }

    return success;
  }

  async incrementTicketTypeAvailability(
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    this.logger.debug(
      `Incrementing availability for ticket type ${ticketTypeId} by ${quantity}`,
    );

    // Atomic update: decrement sold_quantity (release tickets back to pool)
    const result = await this.ticketTypeOrmRepository
      .createQueryBuilder()
      .update(TicketTypeOrmEntity)
      .set({
        soldQuantity: () => 'sold_quantity - :qty',
      })
      .where('id = :id', { id: ticketTypeId })
      .andWhere('sold_quantity >= :qty', { qty: quantity })
      .execute();

    const success = (result.affected ?? 0) > 0;
    if (!success) {
      this.logger.warn(
        `Failed to increment availability for ticket type ${ticketTypeId}`,
      );
    }

    return success;
  }
}
