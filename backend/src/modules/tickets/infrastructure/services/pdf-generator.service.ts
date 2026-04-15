import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { QRCodeService } from './qr-code.service';

// ============================================
// Types
// ============================================

export interface TicketPDFParams {
  ticket: {
    id: string;
    qrCode: string;
    holderName: string;
    priceAmount: number;
    priceCurrency: string;
  };
  event: {
    title: string;
    startDate: Date;
    location: string;
  };
  ticketTypeName: string;
}

// ============================================
// PDF Generator Service
// ============================================

/**
 * PDF Generator Service
 *
 * Creates downloadable PDF tickets using pdfkit.
 * Each PDF contains:
 * - Tickr branding header
 * - Event name, date, and location
 * - Ticket holder name, type, and price
 * - QR code image (centered)
 * - Instructions text
 * - Ticket ID footer
 */
@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  constructor(private readonly qrCodeService: QRCodeService) {}

  /**
   * Generate a complete PDF ticket
   *
   * @param params - Ticket, event, and ticket type details
   * @returns PDF buffer ready for S3 upload
   */
  async generateTicketPDF(params: TicketPDFParams): Promise<Buffer> {
    this.logger.debug(`Generating PDF for ticket: ${params.ticket.id}`);

    const qrImageBuffer = await this.qrCodeService.generateQRImage(
      params.ticket.qrCode,
    );

    const pdfBuffer = await this.buildPDF(params, qrImageBuffer);

    this.logger.debug(
      `PDF generated for ticket ${params.ticket.id}: ${pdfBuffer.length} bytes`,
    );

    return pdfBuffer;
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildPDF(params: TicketPDFParams, qrImage: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 40,
        info: {
          Title: `Tickr - ${params.event.title}`,
          Author: 'Tickr',
          Subject: `Ticket for ${params.event.title}`,
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header: Tickr branding ──
      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#6366f1')
        .text('TICKR', { align: 'center' });

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Your Digital Ticket', { align: 'center' });

      // ── Divider ──
      doc.moveDown(0.8);
      this.drawDivider(doc);
      doc.moveDown(0.8);

      // ── Event Details ──
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(params.event.title, { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#374151');

      const formattedDate = this.formatDate(params.event.startDate);
      doc.text(`📅  ${formattedDate}`, { align: 'center' });
      doc.text(`📍  ${params.event.location}`, { align: 'center' });

      // ── Divider ──
      doc.moveDown(0.8);
      this.drawDivider(doc);
      doc.moveDown(0.8);

      // ── Ticket Info ──
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Ticket Details', { align: 'center' });

      doc.moveDown(0.4);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#374151');

      doc.text(`Holder: ${params.ticket.holderName}`, { align: 'center' });
      doc.text(`Type: ${params.ticketTypeName}`, { align: 'center' });
      doc.text(
        `Price: ${params.ticket.priceAmount.toFixed(2)} ${params.ticket.priceCurrency}`,
        { align: 'center' },
      );

      // ── QR Code ──
      doc.moveDown(1);

      const qrSize = 180;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const qrX = doc.page.margins.left + (pageWidth - qrSize) / 2;

      doc.image(qrImage, qrX, doc.y, {
        width: qrSize,
        height: qrSize,
      });

      doc.y += qrSize + 10;

      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(params.ticket.qrCode, { align: 'center' });

      // ── Instructions ──
      doc.moveDown(1);
      this.drawDivider(doc);
      doc.moveDown(0.5);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(
          'Present this QR code at the venue entrance for check-in. ' +
            'This ticket is non-duplicable and linked to your account.',
          { align: 'center', lineGap: 2 },
        );

      // ── Footer ──
      doc.moveDown(1);

      doc
        .fontSize(7)
        .fillColor('#d1d5db')
        .text(`Ticket ID: ${params.ticket.id}`, { align: 'center' });

      doc
        .text('Powered by Tickr — tickr.tn', { align: 'center' });

      doc.end();
    });
  }

  private drawDivider(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(right, y)
      .stroke();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
