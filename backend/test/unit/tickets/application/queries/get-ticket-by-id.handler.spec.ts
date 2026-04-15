/**
 * @file GetTicketByIdHandler Unit Tests
 */

import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetTicketByIdHandler } from '@modules/tickets/application/queries/get-ticket-by-id/get-ticket-by-id.handler';
import { GetTicketByIdQuery } from '@modules/tickets/application/queries/get-ticket-by-id/get-ticket-by-id.query';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';

describe('GetTicketByIdHandler', () => {
  let handler: GetTicketByIdHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;

  const ticketId = '550e8400-e29b-41d4-a716-446655440010';
  const ownerId = '550e8400-e29b-41d4-a716-446655440003';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440099';

  const createTicket = (): TicketEntity => {
    return TicketEntity.reconstitute({
      id: ticketId,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: ownerId,
      qrCode: QRCodeVO.generate(),
      status: TicketStatus.CONFIRMED,
      priceAmount: 50,
      priceCurrency: 'TND',
      holderName: 'John Doe',
      holderEmail: 'john@example.com',
      holderPhone: '+216 50 000 000',
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
      findById: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
    } as any;

    handler = new GetTicketByIdHandler(mockTicketRepository, mockEventQuery);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return ticket details for the owner', async () => {
      const ticket = createTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const query = new GetTicketByIdQuery(ticketId, ownerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe(ticketId);
      expect(result.value.holderName).toBe('John Doe');
      expect(result.value.status).toBe(TicketStatus.CONFIRMED);
      expect(result.value.pdfUrl).toBe('tickets/dev/abc.pdf');
    });

    it('should map all DTO fields correctly', async () => {
      const ticket = createTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const query = new GetTicketByIdQuery(ticketId, ownerId);
      const result = await handler.execute(query);
      const dto = result.value;

      expect(dto.eventId).toBeDefined();
      expect(dto.ticketTypeId).toBeDefined();
      expect(dto.qrCode).toBeDefined();
      expect(dto.priceAmount).toBe(50);
      expect(dto.priceCurrency).toBe('TND');
      expect(dto.holderEmail).toBe('john@example.com');
      expect(dto.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Failures', () => {
    it('should fail when ticket not found', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      const query = new GetTicketByIdQuery(ticketId, ownerId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_NOT_FOUND');
    });

    it('should deny access when user is not owner and event not found', async () => {
      const ticket = createTicket();
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockEventQuery.getEventById.mockResolvedValue(null);

      const query = new GetTicketByIdQuery(ticketId, otherUserId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
    });
  });
});
