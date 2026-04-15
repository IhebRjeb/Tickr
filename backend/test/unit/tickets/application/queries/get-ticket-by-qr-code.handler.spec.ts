/**
 * @file GetTicketByQRCodeHandler Unit Tests
 */

import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetTicketByQRCodeHandler } from '@modules/tickets/application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.handler';
import { GetTicketByQRCodeQuery } from '@modules/tickets/application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.query';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';

describe('GetTicketByQRCodeHandler', () => {
  let handler: GetTicketByQRCodeHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;

  const qrCode = QRCodeVO.generate();

  const createTicket = (): TicketEntity => {
    return TicketEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode,
      status: TicketStatus.CONFIRMED,
      priceAmount: 50,
      priceCurrency: 'TND',
      holderName: 'John Doe',
      holderEmail: 'john@example.com',
      holderPhone: null,
      checkedInAt: null,
      checkedInBy: null,
      transferredTo: null,
      transferredAt: null,
      transferCount: 0,
      reservedUntil: null,
      pdfUrl: 'tickets/dev/abc.pdf',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockTicketRepository = {
      findByQRCode: jest.fn(),
    } as any;

    handler = new GetTicketByQRCodeHandler(mockTicketRepository);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return ticket DTO for valid QR code', async () => {
      const ticket = createTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      const query = new GetTicketByQRCodeQuery(qrCode.value);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440010');
      expect(result.value.qrCode).toBe(qrCode.value);
      expect(result.value.holderName).toBe('John Doe');
      expect(result.value.status).toBe(TicketStatus.CONFIRMED);
    });

    it('should map all DTO fields correctly', async () => {
      const ticket = createTicket();
      mockTicketRepository.findByQRCode.mockResolvedValue(ticket);

      const query = new GetTicketByQRCodeQuery(qrCode.value);
      const result = await handler.execute(query);
      const dto = result.value;

      expect(dto.eventId).toBeDefined();
      expect(dto.ticketTypeId).toBeDefined();
      expect(dto.priceAmount).toBe(50);
      expect(dto.priceCurrency).toBe('TND');
      expect(dto.holderEmail).toBe('john@example.com');
      expect(dto.pdfUrl).toBe('tickets/dev/abc.pdf');
      expect(dto.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Failures', () => {
    it('should fail when no ticket found for QR code', async () => {
      mockTicketRepository.findByQRCode.mockResolvedValue(null);

      const query = new GetTicketByQRCodeQuery('v1-invalid-code-abcd');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_NOT_FOUND');
    });
  });
});
