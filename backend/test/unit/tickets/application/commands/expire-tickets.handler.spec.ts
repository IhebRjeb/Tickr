/**
 * @file ExpireTicketsHandler Unit Tests
 */

import { ExpireTicketsCommand } from '@modules/tickets/application/commands/expire-tickets/expire-tickets.command';
import { ExpireTicketsHandler } from '@modules/tickets/application/commands/expire-tickets/expire-tickets.handler';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { TicketEntity, QRCodeVO, TicketStatus } from '@modules/tickets/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('ExpireTicketsHandler', () => {
  let handler: ExpireTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const ticketTypeId1 = '550e8400-e29b-41d4-a716-446655440002';
  const ticketTypeId2 = '550e8400-e29b-41d4-a716-446655440099';

  const createExpiredReservation = (
    id: string,
    ticketTypeId: string = ticketTypeId1,
  ): TicketEntity => {
    return TicketEntity.reconstitute({
      id,
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      ticketTypeId,
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
      reservedUntil: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
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
      findExpiredReservations: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
      getTicketTypeAvailability: jest.fn(),
      getTicketTypesByIds: jest.fn(),
      decrementTicketTypeAvailability: jest.fn(),
      incrementTicketTypeAvailability: jest.fn().mockResolvedValue(true),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new ExpireTicketsHandler(
      mockTicketRepository,
      mockEventQuery,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Success', () => {
    it('should return 0 when no expired reservations found', async () => {
      mockTicketRepository.findExpiredReservations.mockResolvedValue([]);

      const command = new ExpireTicketsCommand();
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.expiredCount).toBe(0);
    });

    it('should expire overdue reservations', async () => {
      const ticket1 = createExpiredReservation('t1');
      const ticket2 = createExpiredReservation('t2');
      mockTicketRepository.findExpiredReservations.mockResolvedValue([ticket1, ticket2]);

      const command = new ExpireTicketsCommand();
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.expiredCount).toBe(2);
      expect(ticket1.status).toBe(TicketStatus.EXPIRED);
      expect(ticket2.status).toBe(TicketStatus.EXPIRED);
    });

    it('should restore availability per ticket type', async () => {
      const ticket1 = createExpiredReservation('t1', ticketTypeId1);
      const ticket2 = createExpiredReservation('t2', ticketTypeId1);
      const ticket3 = createExpiredReservation('t3', ticketTypeId2);

      mockTicketRepository.findExpiredReservations.mockResolvedValue([
        ticket1,
        ticket2,
        ticket3,
      ]);

      const command = new ExpireTicketsCommand();
      await handler.execute(command);

      expect(mockEventQuery.incrementTicketTypeAvailability).toHaveBeenCalledWith(
        ticketTypeId1,
        2,
      );
      expect(mockEventQuery.incrementTicketTypeAvailability).toHaveBeenCalledWith(
        ticketTypeId2,
        1,
      );
    });

    it('should publish domain events for each expired ticket', async () => {
      const ticket1 = createExpiredReservation('t1');
      const ticket2 = createExpiredReservation('t2');
      mockTicketRepository.findExpiredReservations.mockResolvedValue([ticket1, ticket2]);

      const command = new ExpireTicketsCommand();
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Failures', () => {
    it('should fail on persistence error', async () => {
      const ticket = createExpiredReservation('t1');
      mockTicketRepository.findExpiredReservations.mockResolvedValue([ticket]);
      mockTicketRepository.saveAll.mockRejectedValue(new Error('DB error'));

      const command = new ExpireTicketsCommand();
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
