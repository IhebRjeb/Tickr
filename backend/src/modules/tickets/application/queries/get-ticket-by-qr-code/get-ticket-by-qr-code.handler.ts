import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { TicketDto } from '../../dtos/ticket.dto';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  GetTicketByQRCodeQuery,
  type GetTicketByQRCodeErrorQuery,
  type GetTicketByQRCodeResultQuery,
} from './get-ticket-by-qr-code.query';

// Re-export types for external use
export type GetTicketByQRCodeResult = GetTicketByQRCodeResultQuery;
export type GetTicketByQRCodeError = GetTicketByQRCodeErrorQuery;

@Injectable()
export class GetTicketByQRCodeHandler {
  private readonly logger = new Logger(GetTicketByQRCodeHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async execute(
    query: GetTicketByQRCodeQuery,
  ): Promise<Result<GetTicketByQRCodeResult, GetTicketByQRCodeError>> {
    this.logger.debug(`Looking up ticket by QR code`);

    const ticket = await this.ticketRepository.findByQRCode(query.qrCode);
    if (!ticket) {
      return Result.fail({
        type: 'TICKET_NOT_FOUND',
        message: 'No ticket found for the provided QR code',
      });
    }

    const dto: TicketDto = {
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

    return Result.ok(dto);
  }
}
