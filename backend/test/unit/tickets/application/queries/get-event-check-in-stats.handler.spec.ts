/**
 * @file GetEventCheckInStatsHandler Unit Tests
 */

import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetEventCheckInStatsHandler } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventCheckInStatsQuery } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.query';
import { Logger } from '@nestjs/common';

describe('GetEventCheckInStatsHandler', () => {
  let handler: GetEventCheckInStatsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;

  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockTicketRepository = {
      countByEventId: jest.fn(),
      countCheckedInByEventId: jest.fn(),
    } as any;

    mockEventQuery = {
      getEventById: jest.fn(),
    } as any;

    handler = new GetEventCheckInStatsHandler(mockTicketRepository, mockEventQuery);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return check-in statistics', async () => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: eventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
      mockTicketRepository.countByEventId.mockResolvedValue(100);
      mockTicketRepository.countCheckedInByEventId.mockResolvedValue(75);

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.totalTickets).toBe(100);
      expect(result.value.checkedIn).toBe(75);
      expect(result.value.checkInRate).toBe(75);
    });

    it('should handle 0 tickets (no division by zero)', async () => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: eventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
      mockTicketRepository.countByEventId.mockResolvedValue(0);
      mockTicketRepository.countCheckedInByEventId.mockResolvedValue(0);

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.checkInRate).toBe(0);
    });

    it('should round check-in rate', async () => {
      mockEventQuery.getEventById.mockResolvedValue({
        id: eventId,
        status: 'PUBLISHED',
        startDate: new Date(),
        endDate: new Date(),
      });
      mockTicketRepository.countByEventId.mockResolvedValue(3);
      mockTicketRepository.countCheckedInByEventId.mockResolvedValue(1);

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.value.checkInRate).toBe(33); // 33.33% rounded
    });
  });

  describe('Failures', () => {
    it('should fail when event not found', async () => {
      mockEventQuery.getEventById.mockResolvedValue(null);

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
    });
  });
});
