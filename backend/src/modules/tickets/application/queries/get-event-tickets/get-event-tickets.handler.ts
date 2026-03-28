import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { TicketEntity } from '../../../domain/entities/ticket.entity';
import type { PaginatedTicketListDto, TicketDto } from '../../dtos/ticket.dto';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  GetEventTicketsQuery,
  type GetEventTicketsErrorQuery,
  type GetEventTicketsResultQuery,
} from './get-event-tickets.query';

// Re-export types for external use
export type GetEventTicketsResult = GetEventTicketsResultQuery;
export type GetEventTicketsError = GetEventTicketsErrorQuery;

@Injectable()
export class GetEventTicketsHandler {
  private readonly logger = new Logger(GetEventTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  async execute(
    query: GetEventTicketsQuery,
  ): Promise<Result<GetEventTicketsResult, GetEventTicketsError>> {
    this.logger.debug(
      `Getting tickets for event ${query.eventId}, page ${query.page}`,
    );

    // Validate event exists
    const event = await this.eventQuery.getEventById(query.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event '${query.eventId}' not found`,
      });
    }

    // TODO: Validate organizer ownership via cross-module port
    // For now, authorization is handled at the controller/guard level

    const result = await this.ticketRepository.findByEventId(
      query.eventId,
      query.page,
      query.limit,
    );

    const totalPages = Math.ceil(result.total / query.limit);

    const paginatedResult: PaginatedTicketListDto = {
      data: result.data.map((ticket) => this.mapToTicketDto(ticket)),
      total: result.total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    };

    this.logger.debug(
      `Found ${result.total} tickets for event ${query.eventId}`,
    );

    return Result.ok(paginatedResult);
  }

  private mapToTicketDto(ticket: TicketEntity): TicketDto {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      ticketTypeId: ticket.ticketTypeId,
      qrCode: ticket.qrCode.value,
      status: ticket.status,
      priceAmount: ticket.priceAmount,
      priceCurrency: ticket.priceCurrency,
      holderName: ticket.holderName,
      holderEmail: ticket.holderEmail,
      pdfUrl: ticket.pdfUrl,
      checkedInAt: ticket.checkedInAt,
      reservedUntil: ticket.reservedUntil,
      createdAt: ticket.createdAt,
    };
  }
}
