/**
 * @file GetPublishedEventsHandler Unit Tests
 * @description Tests for GetPublishedEvents query handler
 */


import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import {
  GetPublishedEventsQuery,
  GetPublishedEventsHandler,
} from '@modules/events/application/queries/get-published-events';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { Logger } from '@nestjs/common';

describe('GetPublishedEventsHandler', () => {
  let handler: GetPublishedEventsHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const organizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockEventRepository = {
      findPublished: jest.fn(),
    } as any;

    handler = new GetPublishedEventsHandler(mockEventRepository);

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
  const createTestEvent = (title: string, category: EventCategory = EventCategory.CONCERT): EventEntity => {
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
      category,
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
    event.publish();

    return event;
  };

  describe('Success Cases', () => {
    it('should return published events', async () => {
      const events = [
        createTestEvent('Event 1'),
        createTestEvent('Event 2'),
      ];

      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult(events, 2),
      );

      const query = new GetPublishedEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
    });

    it('should pass filters to repository', async () => {
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const filters = {
        category: EventCategory.CONCERT,
        city: 'Tunis',
        country: 'Tunisia',
        minPrice: 10,
        maxPrice: 100,
      };

      const query = new GetPublishedEventsQuery(filters);
      await handler.execute(query);

      expect(mockEventRepository.findPublished).toHaveBeenCalledWith(
        expect.objectContaining(filters),
        expect.any(Object),
      );
    });

    it('should apply pagination and sorting', async () => {
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult([], 0, 2, 10),
      );

      const query = new GetPublishedEventsQuery({}, 2, 10, 'startDate', 'ASC');
      await handler.execute(query);

      expect(mockEventRepository.findPublished).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          page: 2,
          limit: 10,
          sortBy: 'startDate',
          sortOrder: 'ASC',
        }),
      );
    });

    it('should return empty results when no events match', async () => {
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetPublishedEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should include ticket summary in results', async () => {
      const events = [createTestEvent('Event 1')];

      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetPublishedEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data[0].ticketSummary).toBeDefined();
      expect(result.value.data[0].ticketSummary.minPrice).toBe(50);
      expect(result.value.data[0].ticketSummary.maxPrice).toBe(50);
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new GetPublishedEventsQuery();

      expect(Object.isFrozen(query)).toBe(true);
    });

    it('should create query from object with defaults', () => {
      const query = GetPublishedEventsQuery.fromObject({});

      expect(query.filters).toEqual({});
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('startDate');
      expect(query.sortOrder).toBe('ASC');
    });

    it('should create query from object with custom values', () => {
      const query = GetPublishedEventsQuery.fromObject({
        filters: { category: EventCategory.CONFERENCE },
        page: 3,
        limit: 50,
        sortBy: 'title',
        sortOrder: 'DESC',
      });

      expect(query.filters.category).toBe(EventCategory.CONFERENCE);
      expect(query.page).toBe(3);
      expect(query.limit).toBe(50);
      expect(query.sortBy).toBe('title');
      expect(query.sortOrder).toBe('DESC');
    });
  });
});
