import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { TicketDetailDto } from '../../dtos/ticket-detail.dto';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  GetTicketByIdQuery,
  type GetTicketByIdErrorQuery,
  type GetTicketByIdResultQuery,
} from './get-ticket-by-id.query';

// Re-export types for external use
export type GetTicketByIdResult = GetTicketByIdResultQuery;
export type GetTicketByIdError = GetTicketByIdErrorQuery;

@Injectable()
export class GetTicketByIdHandler {
  private readonly logger = new Logger(GetTicketByIdHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
  ) {}

  async execute(
    query: GetTicketByIdQuery,
  ): Promise<Result<GetTicketByIdResult, GetTicketByIdError>> {
    this.logger.debug(`Getting ticket by ID: ${query.ticketId}`);

    const ticket = await this.ticketRepository.findById(query.ticketId);
    if (!ticket) {
      return Result.fail({
        type: 'TICKET_NOT_FOUND',
        message: `Ticket '${query.ticketId}' not found`,
      });
    }

    // Access control: owner or event organizer
    const isOwner = ticket.userId === query.requestingUserId;
    if (!isOwner) {
      const event = await this.eventQuery.getEventById(ticket.eventId);
      // If event not found or requesting user is not the organizer, deny
      if (!event) {
        return Result.fail({
          type: 'ACCESS_DENIED',
          message: 'You do not have permission to view this ticket',
        });
      }
      // Note: organizer check requires cross-module user validation,
      // handled at controller level via guards for now
    }

    const dto: TicketDetailDto = {
      id: ticket.id,
      eventId: ticket.eventId,
      ticketTypeId: ticket.ticketTypeId,
      orderId: ticket.orderId,
      userId: ticket.userId,
      qrCode: ticket.qrCode.value,
      status: ticket.status,
      priceAmount: ticket.priceAmount,
      priceCurrency: ticket.priceCurrency,
      holderName: ticket.holderName,
      holderEmail: ticket.holderEmail,
      holderPhone: ticket.holderPhone,
      checkedInAt: ticket.checkedInAt,
      checkedInBy: ticket.checkedInBy,
      transferredTo: ticket.transferredTo,
      transferredAt: ticket.transferredAt,
      transferCount: ticket.transferCount,
      reservedUntil: ticket.reservedUntil,
      pdfUrl: ticket.pdfUrl,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };

    return Result.ok(dto);
  }
}
