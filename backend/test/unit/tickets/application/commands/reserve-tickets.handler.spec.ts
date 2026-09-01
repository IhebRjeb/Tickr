/**
 * @file ReserveTicketsHandler Unit Tests
 */

import { ReserveTicketsCommand } from '@modules/tickets/application/commands/reserve-tickets/reserve-tickets.command';
import { ReserveTicketsHandler } from '@modules/tickets/application/commands/reserve-tickets/reserve-tickets.handler';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('ReserveTicketsHandler', () => {
  let handler: ReserveTicketsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validEventId = '550e8400-e29b-41d4-a716-446655440001';
  const validTicketTypeId = '550e8400-e29b-41d4-a716-446655440002';
  const validUserId = '550e8400-e29b-41d4-a716-446655440003';

  const createCommand = (overrides: Record<string, unknown> = {}) =>
    new ReserveTicketsCommand(
      (overrides.eventId as string) ?? validEventId,
      (overrides.ticketTypeId as string) ?? validTicketTypeId,
      (overrides.userId as string) ?? validUserId,
      (overrides.holders as any[]) ?? [
        { name: 'John Doe', email: 'john@example.com' },
      ],
    );

  beforeEach(() => {
    mockTicketRepository = {
      save: jest.fn(),
      saveAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByQRCode: jest.fn(),
      findByOrderId: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpiredReservations: jest.fn(),
      countByEventId: jest.fn(),
      countCheckedInByEventId: jest.fn(),
      getCheckInStats: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
      getTicketTypeAvailability: jest.fn(),
      getTicketTypesByIds: jest.fn(),
      decrementTicketTypeAvailability: jest.fn(),
      incrementTicketTypeAvailability: jest.fn(),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new ReserveTicketsHandler(
      mockTicketRepository,
      mockEventQuery,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  // ============================================
  // Success Cases
  // ============================================

  describe('Success', () => {
    beforeEach(() => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      });
      mockEventQuery.getTicketTypeAvailability.mockResolvedValue({
        available: 100,
        price: 50,
        currency: 'TND',
        name: 'Standard',
      });
      mockEventQuery.decrementTicketTypeAvailability.mockResolvedValue(true);
      mockTicketRepository.saveAll.mockImplementation(async (tickets) => tickets);
    });

    it('should reserve tickets successfully', async () => {
      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.ticketIds).toHaveLength(1);
      expect(result.value.reservedUntil).toBeInstanceOf(Date);
    });

    it('should create N tickets for N holders', async () => {
      const command = createCommand({
        holders: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
          { name: 'Charlie', email: 'charlie@example.com' },
        ],
      });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.ticketIds).toHaveLength(3);
      expect(mockTicketRepository.saveAll).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
      );
    });

    it('should decrement availability atomically', async () => {
      const command = createCommand({
        holders: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
        ],
      });

      await handler.execute(command);

      expect(mockEventQuery.decrementTicketTypeAvailability).toHaveBeenCalledWith(
        validTicketTypeId,
        2,
      );
    });

    it('should publish domain events for each ticket', async () => {
      const command = createCommand({
        holders: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
        ],
      });

      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(2);
    });

    it('should set reservedUntil to ~15 minutes from now', async () => {
      const before = Date.now();
      const command = createCommand();
      const result = await handler.execute(command);
      const after = Date.now();

      const expected15Min = 15 * 60 * 1000;
      const reservedUntil = result.value.reservedUntil.getTime();

      expect(reservedUntil).toBeGreaterThanOrEqual(before + expected15Min - 1000);
      expect(reservedUntil).toBeLessThanOrEqual(after + expected15Min + 1000);
    });
  });

  // ============================================
  // Failure Cases
  // ============================================

  describe('Event Validation', () => {
    it('should fail when event not found', async () => {
      mockEventQuery.getEventById.mockResolvedValue(null);

      const result = await handler.execute(createCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
    });

    it('should fail when event is not PUBLISHED', async () => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'DRAFT',
        startDate: new Date(),
        endDate: new Date(),
      });

      const result = await handler.execute(createCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_PUBLISHED');
    });
  });

  describe('Ticket Type Validation', () => {
    beforeEach(() => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
    });

    it('should fail when ticket type not found', async () => {
      mockEventQuery.getTicketTypeAvailability.mockResolvedValue(null);

      const result = await handler.execute(createCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_TYPE_NOT_FOUND');
    });

    it('should fail when insufficient availability', async () => {
      mockEventQuery.getTicketTypeAvailability.mockResolvedValue({
        available: 1,
        price: 50,
        currency: 'TND',
        name: 'Standard',
      });

      const result = await handler.execute(
        createCommand({
          holders: [
            { name: 'Alice', email: 'a@x.com' },
            { name: 'Bob', email: 'b@x.com' },
          ],
        }),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INSUFFICIENT_AVAILABILITY');
    });

    it('should fail when atomic decrement fails (race condition)', async () => {
      mockEventQuery.getTicketTypeAvailability.mockResolvedValue({
        available: 10,
        price: 50,
        currency: 'TND',
        name: 'Standard',
      });
      mockEventQuery.decrementTicketTypeAvailability.mockResolvedValue(false);

      const result = await handler.execute(createCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INSUFFICIENT_AVAILABILITY');
    });
  });

  describe('Persistence Failure', () => {
    beforeEach(() => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: validEventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
      mockEventQuery.getTicketTypeAvailability.mockResolvedValue({
        available: 100,
        price: 50,
        currency: 'TND',
        name: 'Standard',
      });
      mockEventQuery.decrementTicketTypeAvailability.mockResolvedValue(true);
    });

    it('should rollback availability on save failure', async () => {
      mockTicketRepository.saveAll.mockRejectedValue(new Error('DB down'));

      const result = await handler.execute(createCommand());

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(mockEventQuery.incrementTicketTypeAvailability).toHaveBeenCalledWith(
        validTicketTypeId,
        1,
      );
    });
  });
});
