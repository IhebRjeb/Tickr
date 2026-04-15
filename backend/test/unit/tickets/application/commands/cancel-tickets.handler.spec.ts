/**
 * @file CancelTicketsHandler Unit Tests
 */

import { CancelTicketsCommand } from '@modules/tickets/application/commands/cancel-tickets/cancel-tickets.command';
import { CancelTicketsHandler } from '@modules/tickets/application/commands/cancel-tickets/cancel-tickets.handler';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('CancelTicketsHandler', () => {
  let handler: CancelTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const ticketId = '550e8400-e29b-41d4-a716-446655440010';
  const ticketTypeId = '550e8400-e29b-41d4-a716-446655440002';

  const createTicket = (status: TicketStatus): TicketEntity => {
    return TicketEntity.reconstitute({
      id: ticketId,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId,
      orderId: status === TicketStatus.CONFIRMED ? 'order-123' : null,
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode: QRCodeVO.generate(),
      status,
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
      reservedUntil: status === TicketStatus.RESERVED ? new Date(Date.now() + 15 * 60 * 1000) : null,
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockTicketRepository = {
      save: jest.fn(),
      saveAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
      getTicketTypeAvailability: jest.fn(),
      decrementTicketTypeAvailability: jest.fn(),
      incrementTicketTypeAvailability: jest.fn().mockResolvedValue(true),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new CancelTicketsHandler(
      mockTicketRepository,
      mockEventQuery,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Success', () => {
    it('should cancel a RESERVED ticket', async () => {
      const ticket = createTicket(TicketStatus.RESERVED);
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new CancelTicketsCommand([ticketId], 'Changed plans');
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CANCELLED);
    });

    it('should cancel a CONFIRMED ticket', async () => {
      const ticket = createTicket(TicketStatus.CONFIRMED);
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new CancelTicketsCommand([ticketId], 'Want refund');
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CANCELLED);
    });

    it('should restore availability per ticket type', async () => {
      const ticket = createTicket(TicketStatus.RESERVED);
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new CancelTicketsCommand([ticketId], 'Test');
      await handler.execute(command);

      expect(mockEventQuery.incrementTicketTypeAvailability).toHaveBeenCalledWith(
        ticketTypeId,
        1,
      );
    });

    it('should publish domain events', async () => {
      const ticket = createTicket(TicketStatus.RESERVED);
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new CancelTicketsCommand([ticketId], 'Test');
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failures', () => {
    it('should fail when tickets not found', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      const command = new CancelTicketsCommand([ticketId], 'Test');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKETS_NOT_FOUND');
    });

    it('should fail when ticket is CHECKED_IN', async () => {
      const ticket = createTicket(TicketStatus.CHECKED_IN);
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new CancelTicketsCommand([ticketId], 'Test');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CANCELLATION_FAILED');
    });

    it('should fail on persistence error', async () => {
      const ticket = createTicket(TicketStatus.RESERVED);
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockTicketRepository.saveAll.mockRejectedValue(new Error('DB error'));

      const command = new CancelTicketsCommand([ticketId], 'Test');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
