/**
 * @file GetOrganizerEventsHandler Unit Tests
 * @description Tests for GetOrganizerEvents query handler
 */


import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import {
  GetOrganizerEventsQuery,
  GetOrganizerEventsHandler,
} from '@modules/events/application/queries/get-organizer-events';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { Logger } from '@nestjs/common';

describe('GetOrganizerEventsHandler', () => {
  let handler: GetOrganizerEventsHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const organizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockEventRepository = {
      findByOrganizerId: jest.fn(),
    } as any;

    handler = new GetOrganizerEventsHandler(mockEventRepository);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create paginated result
  const createPaginatedResult = <T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 20,
  ) => {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  };

  // Helper to create a test event
  const createTestEvent = (title: string): EventEntity => {
    const location = LocationVO.create({
      city: 'Tunis',
      country: 'Tunisia',
    });
    const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    const dateRange = EventDateRangeVO.create(
      startDate,
      endDate,
      true,
    );

    const eventResult = EventEntity.create({
      organizerId,
      title,
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value;

    // Add a ticket type
    const ticketTypeResult = TicketTypeEntity.create({
      eventId: event.id,
      name: 'General',
      price: TicketPriceVO.create(50, Currency.TND),
      quantity: 100,
      salesPeriod: SalesPeriodVO.create(
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-07-14T23:59:59Z'),
      ),
    });

    event.addTicketType(ticketTypeResult.value);

    return event;
  };

  describe('Success Cases', () => {
    it('should return paginated events for organizer', async () => {
      const events = [
        createTestEvent('Event 1'),
        createTestEvent('Event 2'),
      ];

      mockEventRepository.findByOrganizerId.mockResolvedValue(
        createPaginatedResult(events, 2),
      );

      const query = new GetOrganizerEventsQuery(organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
    });

    it('should return empty result when organizer has no events', async () => {
      mockEventRepository.findByOrganizerId.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetOrganizerEventsQuery(organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should apply pagination parameters', async () => {
      const events = [createTestEvent('Event 1')];

      mockEventRepository.findByOrganizerId.mockResolvedValue(
        createPaginatedResult(events, 50, 2, 10),
      );

      const query = new GetOrganizerEventsQuery(organizerId, undefined, 2, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.page).toBe(2);
      expect(result.value.limit).toBe(10);
      expect(result.value.totalPages).toBe(5);
      expect(result.value.hasNextPage).toBe(true);
      expect(result.value.hasPreviousPage).toBe(true);

      expect(mockEventRepository.findByOrganizerId).toHaveBeenCalledWith(
        organizerId,
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should include ticket summary in response', async () => {
      const events = [createTestEvent('Event 1')];

      mockEventRepository.findByOrganizerId.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetOrganizerEventsQuery(organizerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data[0].ticketSummary).toBeDefined();
      expect(result.value.data[0].ticketSummary.ticketTypeCount).toBe(1);
    });

    it('should calculate pagination correctly for last page', async () => {
      mockEventRepository.findByOrganizerId.mockResolvedValue(
        createPaginatedResult([createTestEvent('Event 1')], 25, 3, 10),
      );

      const query = new GetOrganizerEventsQuery(organizerId, undefined, 3, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.hasNextPage).toBe(false);
      expect(result.value.hasPreviousPage).toBe(true);
      expect(result.value.totalPages).toBe(3);
    });
  });

  describe('Error Cases', () => {
    it('should return error for empty organizer ID', async () => {
      const query = new GetOrganizerEventsQuery('');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_ORGANIZER_ID');
    });

    it('should return error for whitespace organizer ID', async () => {
      const query = new GetOrganizerEventsQuery('   ');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_ORGANIZER_ID');
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new GetOrganizerEventsQuery(organizerId);

      expect(Object.isFrozen(query)).toBe(true);
    });

    it('should create query from object with defaults', () => {
      const query = GetOrganizerEventsQuery.fromObject({
        organizerId,
      });

      expect(query.organizerId).toBe(organizerId);
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('createdAt');
      expect(query.sortOrder).toBe('DESC');
    });

    it('should create query from object with custom values', () => {
      const query = GetOrganizerEventsQuery.fromObject({
        organizerId,
        status: EventStatus.PUBLISHED,
        page: 2,
        limit: 10,
        sortBy: 'startDate',
        sortOrder: 'ASC',
      });

      expect(query.status).toBe(EventStatus.PUBLISHED);
      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
      expect(query.sortBy).toBe('startDate');
      expect(query.sortOrder).toBe('ASC');
    });
  });
});
