/**
 * @file GetEventCheckInStatsHandler Unit Tests
 */

import type { EventCheckInAccessPort } from '@modules/tickets/application/ports/event-check-in-access.port';
import type { EventQueryPort } from '@modules/tickets/application/ports/event-query.port';
import type { TicketRepositoryPort } from '@modules/tickets/application/ports/ticket.repository.port';
import { GetEventCheckInStatsHandler } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventCheckInStatsQuery } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.query';
import { Logger } from '@nestjs/common';

describe('GetEventCheckInStatsHandler', () => {
  let handler: GetEventCheckInStatsHandler;
  let mockTicketRepository: jest.Mocked<TicketRepositoryPort>;
  let mockEventCheckInAccess: jest.Mocked<EventCheckInAccessPort>;
  let mockEventQuery: jest.Mocked<EventQueryPort>;

  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const organizerId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockTicketRepository = {
      getCheckInStats: jest.fn(),
    } as any;

    mockEventCheckInAccess = {
      resolve: jest.fn().mockResolvedValue({
        eventId,
        startDate: new Date(),
        endDate: new Date(),
        authorizationSource: 'OWNER',
        assignmentId: null,
        canCheckIn: true,
        canViewBasicStats: true,
      }),
    };
    mockEventQuery = {
      getTicketTypesByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventQueryPort>;

    handler = new GetEventCheckInStatsHandler(
      mockTicketRepository,
      mockEventCheckInAccess,
      mockEventQuery,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return check-in statistics', async () => {
      mockTicketRepository.getCheckInStats.mockResolvedValue({
        totalEligible: 100,
        checkedIn: 75,
        byTicketType: [],
      });

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.totalTickets).toBe(100);
      expect(result.value.checkedIn).toBe(75);
      expect(result.value.remaining).toBe(25);
      expect(result.value.checkInRate).toBe(75);
    });

    it('should handle 0 tickets (no division by zero)', async () => {
      mockTicketRepository.getCheckInStats.mockResolvedValue({
        totalEligible: 0,
        checkedIn: 0,
        byTicketType: [],
      });

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.checkInRate).toBe(0);
    });

    it('should round check-in rate', async () => {
      mockTicketRepository.getCheckInStats.mockResolvedValue({
        totalEligible: 3,
        checkedIn: 1,
        byTicketType: [],
      });

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.value.checkInRate).toBe(33); // 33.33% rounded
    });

    it('returns a real per-ticket-type breakdown', async () => {
      mockTicketRepository.getCheckInStats.mockResolvedValue({
        totalEligible: 10,
        checkedIn: 6,
        byTicketType: [
          {
            ticketTypeId: '550e8400-e29b-41d4-a716-446655440010',
            totalEligible: 10,
            checkedIn: 6,
          },
        ],
      });
      mockEventQuery.getTicketTypesByIds.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          name: 'General Admission',
        },
      ]);

      const result = await handler.execute(
        new GetEventCheckInStatsQuery(eventId, organizerId),
      );

      expect(result.value.byType).toEqual([
        {
          ticketTypeName: 'General Admission',
          total: 10,
          checkedIn: 6,
          rate: 60,
        },
      ]);
    });
  });

  describe('Failures', () => {
    it('should fail when event access is denied', async () => {
      mockEventCheckInAccess.resolve.mockResolvedValue(null);

      const query = new GetEventCheckInStatsQuery(eventId, organizerId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
      expect(mockTicketRepository.getCheckInStats).not.toHaveBeenCalled();
    });
  });
});
