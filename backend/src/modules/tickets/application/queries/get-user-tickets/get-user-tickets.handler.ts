import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { TicketEntity } from '../../../domain/entities/ticket.entity';
import type { PaginatedTicketListDto, TicketDto } from '../../dtos/ticket.dto';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  GetUserTicketsQuery,
  type GetUserTicketsResultQuery,
} from './get-user-tickets.query';

// Re-export types for external use
export type GetUserTicketsResult = GetUserTicketsResultQuery;

@Injectable()
export class GetUserTicketsHandler {
  private readonly logger = new Logger(GetUserTicketsHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async execute(
    query: GetUserTicketsQuery,
  ): Promise<Result<GetUserTicketsResult, never>> {
    this.logger.debug(
      `Getting tickets for user ${query.userId}, page ${query.page}`,
    );

    const result = await this.ticketRepository.findByUserId(
      query.userId,
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

    this.logger.debug(`Found ${result.total} tickets for user ${query.userId}`);

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
