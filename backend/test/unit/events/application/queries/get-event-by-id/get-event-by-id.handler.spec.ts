/**
 * @file GetEventByIdHandler Unit Tests
 * @description Tests for GetEventById query handler
 */


import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import {
  GetEventByIdQuery,
  GetEventByIdHandler,
} from '@modules/events/application/queries/get-event-by-id';
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

describe('GetEventByIdHandler', () => {
  let handler: GetEventByIdHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const userId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const eventId = 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e';
  const otherUserId = 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f';

  beforeEach(() => {
    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    handler = new GetEventByIdHandler(mockEventRepository);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a test event
  const createTestEvent = (status: EventStatus = EventStatus.PUBLISHED): EventEntity => {
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
      organizerId: userId,
      title: 'Test Event',
      description: 'Test description',
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value;

    // Add a ticket type
    const ticketTypeResult = TicketTypeEntity.create({
      eventId: event.id,
      name: 'General Admission',
      price: TicketPriceVO.create(50, Currency.TND),
      quantity: 100,
      salesPeriod: SalesPeriodVO.create(
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-07-14T23:59:59Z'),
      ),
    });

    event.addTicketType(ticketTypeResult.value);

    // If we need published status, publish the event
    if (status === EventStatus.PUBLISHED) {
      event.publish();
    }

    return event;
  };

  describe('Success Cases', () => {
    it('should return published event for any user', async () => {
      const event = createTestEvent(EventStatus.PUBLISHED);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe(event.id);
      expect(result.value.title).toBe('Test Event');
      expect(result.value.status).toBe(EventStatus.PUBLISHED);
    });

    it('should return published event with ticket types', async () => {
      const event = createTestEvent(EventStatus.PUBLISHED);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.ticketTypes).toHaveLength(1);
      expect(result.value.ticketTypes[0].name).toBe('General Admission');
      expect(result.value.ticketTypes[0].priceAmount).toBe(50);
    });

    it('should return draft event for the organizer', async () => {
      const event = createTestEvent(EventStatus.DRAFT);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId, userId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.status).toBe(EventStatus.DRAFT);
    });

    it('should include calculated fields', async () => {
      const event = createTestEvent(EventStatus.PUBLISHED);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('availableCapacity');
      expect(result.value).toHaveProperty('salesProgress');
      expect(result.value).toHaveProperty('isSoldOut');
      expect(result.value).toHaveProperty('isOnSale');
      expect(result.value).toHaveProperty('hasStarted');
      expect(result.value).toHaveProperty('hasEnded');
    });

    it('should include organizer info', async () => {
      const event = createTestEvent(EventStatus.PUBLISHED);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.organizer).toBeDefined();
      expect(result.value.organizer.id).toBe(userId);
    });

    it('should include location info', async () => {
      const event = createTestEvent(EventStatus.PUBLISHED);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.location).toBeDefined();
      expect(result.value.location.city).toBe('Tunis');
      expect(result.value.location.country).toBe('Tunisia');
    });
  });

  describe('Error Cases', () => {
    it('should return EVENT_NOT_FOUND for non-existent event', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      const query = new GetEventByIdQuery('non-existent-id');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
    });

    it('should return ACCESS_DENIED for draft event when not the organizer', async () => {
      const event = createTestEvent(EventStatus.DRAFT);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId, otherUserId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
    });

    it('should return ACCESS_DENIED for draft event when no user specified', async () => {
      const event = createTestEvent(EventStatus.DRAFT);
      mockEventRepository.findById.mockResolvedValue(event);

      const query = new GetEventByIdQuery(eventId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new GetEventByIdQuery(eventId, userId);

      expect(Object.isFrozen(query)).toBe(true);
      expect(() => {
        (query as any).eventId = 'new-id';
      }).toThrow();
    });

    it('should create query from object', () => {
      const query = GetEventByIdQuery.fromObject({
        eventId,
        requestingUserId: userId,
      });

      expect(query.eventId).toBe(eventId);
      expect(query.requestingUserId).toBe(userId);
    });
  });
});
