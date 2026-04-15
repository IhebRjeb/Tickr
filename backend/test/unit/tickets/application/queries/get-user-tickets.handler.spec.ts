/**
 * @file GetUserTicketsHandler Unit Tests
 */

import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetUserTicketsHandler } from '@modules/tickets/application/queries/get-user-tickets/get-user-tickets.handler';
import { GetUserTicketsQuery } from '@modules/tickets/application/queries/get-user-tickets/get-user-tickets.query';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';

describe('GetUserTicketsHandler', () => {
  let handler: GetUserTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;

  const userId = '550e8400-e29b-41d4-a716-446655440003';

  const createTicket = (id: string): TicketEntity => {
    return TicketEntity.reconstitute({
      id,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: 'order-123',
      userId,
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
      findByUserId: jest.fn(),
    } as any;

    handler = new GetUserTicketsHandler(mockTicketRepository);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return paginated ticket list', async () => {
      mockTicketRepository.findByUserId.mockResolvedValue({
        data: [createTicket('t1'), createTicket('t2')],
        total: 5,
      });

      const query = new GetUserTicketsQuery(userId, 1, 2);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const paginated = result.value;
      expect(paginated.data).toHaveLength(2);
      expect(paginated.total).toBe(5);
      expect(paginated.page).toBe(1);
      expect(paginated.limit).toBe(2);
      expect(paginated.totalPages).toBe(3);
      expect(paginated.hasNextPage).toBe(true);
      expect(paginated.hasPreviousPage).toBe(false);
    });

    it('should return empty list when user has no tickets', async () => {
      mockTicketRepository.findByUserId.mockResolvedValue({
        data: [],
        total: 0,
      });

      const query = new GetUserTicketsQuery(userId, 1, 20);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
      expect(result.value.totalPages).toBe(0);
    });

    it('should correctly calculate hasPreviousPage on page 2', async () => {
      mockTicketRepository.findByUserId.mockResolvedValue({
        data: [createTicket('t3')],
        total: 5,
      });

      const query = new GetUserTicketsQuery(userId, 2, 2);
      const result = await handler.execute(query);

      expect(result.value.hasPreviousPage).toBe(true);
      expect(result.value.hasNextPage).toBe(true);
    });

    it('should map ticket DTO fields correctly', async () => {
      mockTicketRepository.findByUserId.mockResolvedValue({
        data: [createTicket('t1')],
        total: 1,
      });

      const query = new GetUserTicketsQuery(userId, 1, 20);
      const result = await handler.execute(query);
      const ticket = result.value.data[0];

      expect(ticket.id).toBe('t1');
      expect(ticket.status).toBe(TicketStatus.CONFIRMED);
      expect(ticket.holderName).toBe('John Doe');
      expect(ticket.priceAmount).toBe(50);
    });
  });
});
