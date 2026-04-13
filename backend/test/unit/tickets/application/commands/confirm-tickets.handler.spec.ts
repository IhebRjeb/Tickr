/**
 * @file ConfirmTicketsHandler Unit Tests
 */

import { ConfirmTicketsCommand } from '@modules/tickets/application/commands/confirm-tickets/confirm-tickets.command';
import { ConfirmTicketsHandler } from '@modules/tickets/application/commands/confirm-tickets/confirm-tickets.handler';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('ConfirmTicketsHandler', () => {
  let handler: ConfirmTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const ticketId1 = '550e8400-e29b-41d4-a716-446655440010';
  const ticketId2 = '550e8400-e29b-41d4-a716-446655440011';
  const orderId = '550e8400-e29b-41d4-a716-446655440020';

  const createReservedTicket = (id: string): TicketEntity => {
    return TicketEntity.reconstitute({
      id,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      userId: '550e8400-e29b-41d4-a716-446655440003',
      qrCode: QRCodeVO.generate(),
      status: TicketStatus.RESERVED,
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
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
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

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new ConfirmTicketsHandler(mockTicketRepository, mockEventPublisher);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Success', () => {
    it('should confirm a single ticket', async () => {
      const ticket = createReservedTicket(ticketId1);
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockTicketRepository.saveAll.mockResolvedValue([ticket]);

      const command = new ConfirmTicketsCommand([ticketId1], orderId);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.confirmedIds).toContain(ticketId1);
      expect(ticket.status).toBe(TicketStatus.CONFIRMED);
      expect(ticket.orderId).toBe(orderId);
    });

    it('should confirm multiple tickets', async () => {
      const ticket1 = createReservedTicket(ticketId1);
      const ticket2 = createReservedTicket(ticketId2);

      mockTicketRepository.findById
        .mockResolvedValueOnce(ticket1)
        .mockResolvedValueOnce(ticket2);
      mockTicketRepository.saveAll.mockResolvedValue([ticket1, ticket2]);

      const command = new ConfirmTicketsCommand([ticketId1, ticketId2], orderId);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.confirmedIds).toHaveLength(2);
    });

    it('should publish events for each confirmed ticket', async () => {
      const ticket = createReservedTicket(ticketId1);
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockTicketRepository.saveAll.mockResolvedValue([ticket]);

      const command = new ConfirmTicketsCommand([ticketId1], orderId);
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failures', () => {
    it('should fail when tickets not found', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      const command = new ConfirmTicketsCommand([ticketId1], orderId);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKETS_NOT_FOUND');
    });

    it('should fail when ticket is not RESERVED', async () => {
      const ticket = createReservedTicket(ticketId1);
      ticket.confirm(orderId); // Already confirmed
      mockTicketRepository.findById.mockResolvedValue(ticket);

      const command = new ConfirmTicketsCommand([ticketId1], 'new-order-id');
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CONFIRMATION_FAILED');
    });

    it('should fail on persistence error', async () => {
      const ticket = createReservedTicket(ticketId1);
      mockTicketRepository.findById.mockResolvedValue(ticket);
      mockTicketRepository.saveAll.mockRejectedValue(new Error('DB error'));

      const command = new ConfirmTicketsCommand([ticketId1], orderId);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
