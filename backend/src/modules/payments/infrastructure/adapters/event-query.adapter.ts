
import {
  EVENT_REPOSITORY,
} from '@modules/events/application/ports/event.repository.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { Injectable, Inject, Logger } from '@nestjs/common';

import type {
  PaymentEventQueryPort,
  PaymentEventInfo,
  PaymentTicketTypeInfo,
} from '../../application/ports/event-query.port';

/**
 * Event Query Adapter (Cross-module: Payments → Events)
 *
 * Anti-corruption layer that translates Events domain data
 * into the Payments module's simplified view.
 */
@Injectable()
export class PaymentEventQueryAdapter implements PaymentEventQueryPort {
  private readonly logger = new Logger(PaymentEventQueryAdapter.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  async getEventById(eventId: string): Promise<PaymentEventInfo | null> {
    this.logger.debug(`Querying event for payment: ${eventId}`);

    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      return null;
    }

    return {
      id: event.id,
      title: event.title,
      status: event.status,
      startDate: event.dateRange.startDate,
      organizerId: event.organizerId,
    };
  }

  async getTicketType(ticketTypeId: string): Promise<PaymentTicketTypeInfo | null> {
    this.logger.debug(`Querying ticket type for payment: ${ticketTypeId}`);

    const event = await this.eventRepository.findByTicketTypeId(ticketTypeId);
    if (!event) {
      return null;
    }

    const ticketType = event.ticketTypes.find((tt) => tt.id === ticketTypeId);
    if (!ticketType) {
      return null;
    }

    return {
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      currency: ticketType.currency,
      available: ticketType.availableQuantity,
    };
  }
}
