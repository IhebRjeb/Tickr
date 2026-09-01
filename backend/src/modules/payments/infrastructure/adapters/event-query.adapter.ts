
import {
  EVENT_REPOSITORY,
  TICKET_TYPE_REPOSITORY,
} from '@modules/events/application/ports/event.repository.port';
import type { EventRepositoryPort, TicketTypeRepositoryPort } from '@modules/events/application/ports/event.repository.port';
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
    @Inject(TICKET_TYPE_REPOSITORY)
    private readonly ticketTypeRepository: TicketTypeRepositoryPort,
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
      commissionRateOverride: event.commissionRateOverride,
    };
  }

  async getTicketType(ticketTypeId: string): Promise<PaymentTicketTypeInfo | null> {
    this.logger.debug(`Querying ticket type for payment: ${ticketTypeId}`);

    const ticketType = await this.ticketTypeRepository.findById(ticketTypeId);
    if (!ticketType) {
      return null;
    }

    return {
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price.amount,
      currency: ticketType.price.currency,
      available: ticketType.getAvailableQuantity(),
    };
  }
}
