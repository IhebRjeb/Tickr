import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENT_QUERY_PORT } from '../../application/ports/event-query.port';
import type { EventQueryPort } from '../../application/ports/event-query.port';
import { TICKET_REPOSITORY } from '../../application/ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../application/ports/ticket.repository.port';
import { TicketConfirmedEvent } from '../../domain/events/ticket-confirmed.event';
import { PDFGeneratorService } from '../services/pdf-generator.service';
import type { TicketPDFParams } from '../services/pdf-generator.service';
import { TicketS3StorageService } from '../services/ticket-s3-storage.service';

/**
 * Infrastructure handler for TicketConfirmedEvent
 *
 * Performs infrastructure side effects after ticket confirmation:
 * 1. Generate ticket PDF with QR code
 * 2. Upload PDF to S3
 * 3. Update ticket with PDF URL
 *
 * Future: Trigger notification to user with ticket PDF
 */
@Injectable()
export class TicketConfirmedInfraHandler {
  private readonly logger = new Logger(TicketConfirmedInfraHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    private readonly pdfGenerator: PDFGeneratorService,
    private readonly s3Storage: TicketS3StorageService,
  ) {}

  @OnEvent('TicketConfirmedEvent')
  async handle(event: TicketConfirmedEvent): Promise<void> {
    this.logger.log(
      `[Infra] Processing TicketConfirmed: ${event.ticketId}`,
    );

    try {
      // 1. Load ticket for PDF generation context
      const ticket = await this.ticketRepository.findById(event.ticketId);
      if (!ticket) {
        this.logger.error(`Ticket ${event.ticketId} not found for PDF generation`);
        return;
      }

      // 2. Get event info for PDF
      const eventInfo = await this.eventQuery.getEventById(event.eventId);

      // 3. Get ticket type info for PDF
      const ticketTypeAvailability = await this.eventQuery.getTicketTypeAvailability(
        event.ticketTypeId,
      );

      // 4. Generate PDF
      const pdfParams: TicketPDFParams = {
        ticket: {
          id: ticket.id,
          qrCode: ticket.qrCode.value,
          holderName: ticket.holderName,
          priceAmount: ticket.priceAmount,
          priceCurrency: ticket.priceCurrency,
        },
        event: {
          title: `Event ${event.eventId}`, // Limited info from anti-corruption layer
          startDate: eventInfo?.startDate ?? new Date(),
          location: '',
        },
        ticketTypeName: ticketTypeAvailability?.name ?? 'Standard',
      };

      const pdfBuffer = await this.pdfGenerator.generateTicketPDF(pdfParams);

      // 5. Upload to S3
      const s3Key = await this.s3Storage.uploadPDF(ticket.id, pdfBuffer);

      // 6. Store S3 key as pdfUrl (signed URL is generated on-demand by controller)
      ticket.setPdfUrl(s3Key);
      await this.ticketRepository.save(ticket);

      this.logger.log(
        `[Infra] PDF generated and uploaded for ticket ${event.ticketId}`,
      );
    } catch (error) {
      // PDF generation failure should not block the ticket flow
      this.logger.error(
        `[Infra] Failed to generate PDF for ticket ${event.ticketId}: ${error}`,
      );
    }
  }
}
