/**
 * @file SearchEventsHandler Unit Tests
 * @description Tests for SearchEvents query handler
 */


import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import {
  SearchEventsQuery,
  SearchEventsHandler,
} from '@modules/events/application/queries/search-events';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { Logger } from '@nestjs/common';

describe('SearchEventsHandler', () => {
  let handler: SearchEventsHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const organizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockEventRepository = {
      searchByTitle: jest.fn(),
    } as any;

    handler = new SearchEventsHandler(mockEventRepository);

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
    event.publish();

    return event;
  };

  describe('Success Cases', () => {
    it('should return search results for valid search term', async () => {
      const events = [
        createTestEvent('Summer Music Festival'),
        createTestEvent('Summer Dance Party'),
      ];

      mockEventRepository.searchByTitle.mockResolvedValue(
        createPaginatedResult(events, 2),
      );

      const query = new SearchEventsQuery('Summer');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
    });

    it('should return empty results when no matches', async () => {
      mockEventRepository.searchByTitle.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new SearchEventsQuery('NonExistentEvent');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should apply pagination parameters', async () => {
      mockEventRepository.searchByTitle.mockResolvedValue(
        createPaginatedResult([createTestEvent('Test')], 50, 2, 10),
      );

      const query = new SearchEventsQuery('Test', 2, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.page).toBe(2);
      expect(result.value.limit).toBe(10);

      expect(mockEventRepository.searchByTitle).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should trim search term', async () => {
      mockEventRepository.searchByTitle.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new SearchEventsQuery('  Music  ');
      await handler.execute(query);

      expect(mockEventRepository.searchByTitle).toHaveBeenCalledWith(
        'Music',
        expect.any(Object),
      );
    });
  });

  describe('Error Cases', () => {
    it('should return error for search term less than 2 characters', async () => {
      const query = new SearchEventsQuery('a');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SEARCH_TERM');
      expect(result.error.message).toContain('at least 2 characters');
    });

    it('should return error for empty search term', async () => {
      const query = new SearchEventsQuery('');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SEARCH_TERM');
    });

    it('should return error for whitespace-only search term', async () => {
      const query = new SearchEventsQuery('   ');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SEARCH_TERM');
    });

    it('should return error for search term exceeding 200 characters', async () => {
      const longTerm = 'a'.repeat(201);
      const query = new SearchEventsQuery(longTerm);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SEARCH_TERM');
      expect(result.error.message).toContain('200 characters');
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new SearchEventsQuery('test');

      expect(Object.isFrozen(query)).toBe(true);
    });

    it('should create query from object with defaults', () => {
      const query = SearchEventsQuery.fromObject({
        searchTerm: 'music',
      });

      expect(query.searchTerm).toBe('music');
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
    });
  });
});
