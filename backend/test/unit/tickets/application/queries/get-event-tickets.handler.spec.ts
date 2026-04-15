/**
 * @file GetEventTicketsHandler Unit Tests
 */

import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetEventTicketsHandler } from '@modules/tickets/application/queries/get-event-tickets/get-event-tickets.handler';
import { GetEventTicketsQuery } from '@modules/tickets/application/queries/get-event-tickets/get-event-tickets.query';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';

describe('GetEventTicketsHandler', () => {
  let handler: GetEventTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;

  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440000';

  const createTicket = (id: string): TicketEntity => {
    return TicketEntity.reconstitute({
      id,
      eventId,
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode: QRCodeVO.generate(),
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
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockTicketRepository = {
      findByEventId: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
    } as any;

    handler = new GetEventTicketsHandler(mockTicketRepository, mockEventQuery);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return paginated event tickets', async () => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: eventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
      mockTicketRepository.findByEventId.mockResolvedValue({
        data: [createTicket('t1'), createTicket('t2')],
        total: 2,
      });

      const query = new GetEventTicketsQuery(eventId, organizerId, 1, 20);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
    });
  });

  describe('Failures', () => {
    it('should fail when event not found', async () => {
      mockEventQuery.getEventById.mockResolvedValue(null);

      const query = new GetEventTicketsQuery(eventId, organizerId, 1, 20);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
    });
  });
});
