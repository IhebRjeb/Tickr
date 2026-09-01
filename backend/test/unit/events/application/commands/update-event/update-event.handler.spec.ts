

import {
  UpdateEventCommand,
  UpdateEventHandler,
} from '@modules/events/application/commands/update-event';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import type { UserValidationServicePort } from '@modules/events/application/ports/user-validation.service.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('UpdateEventHandler', () => {
  let handler: UpdateEventHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;
  let mockUserValidationService: jest.Mocked<UserValidationServicePort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const userId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const eventId = 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e';
  const differentUserId = 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f';

  beforeEach(() => {
    mockEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockUserValidationService = {
      validateOrganizer: jest.fn(),
      userExists: jest.fn(),
      hasRole: jest.fn(),
      isEventOwner: jest.fn(),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new UpdateEventHandler(
      mockEventRepository,
      mockUserValidationService,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createDraftEvent = (): EventEntity => {
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

    const result = EventEntity.create({
      organizerId: userId,
      title: 'Original Title',
      description: 'Original description',
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    return result.value;
  };

  describe('Success Cases', () => {
    it('should update event title successfully', async () => {
      const event = createDraftEvent();
      const command = new UpdateEventCommand(eventId, userId, 'Updated Title');

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockEventRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should update multiple fields at once', async () => {
      const event = createDraftEvent();
      const command = new UpdateEventCommand(
        eventId,
        userId,
        'New Title',
        'New description',
        EventCategory.FESTIVAL,
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should update location for DRAFT events', async () => {
      const event = createDraftEvent();
      const newLocation = {
        city: 'Sousse',
        country: 'Tunisia',
        address: '456 New Street',
      };
      const command = new UpdateEventCommand(eventId, userId, undefined, undefined, undefined, newLocation);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should update dates for DRAFT events', async () => {
      const event = createDraftEvent();
      const newStartDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const newEndDate = new Date(newStartDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      const command = new UpdateEventCommand(
        eventId,
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        newStartDate,
        newEndDate,
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should fail when no changes provided', async () => {
      const command = new UpdateEventCommand(eventId, userId);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NO_CHANGES');
      expect(mockEventRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when event not found', async () => {
      const command = new UpdateEventCommand(eventId, userId, 'New Title');
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when user is not the owner', async () => {
      const event = createDraftEvent();
      const command = new UpdateEventCommand(eventId, differentUserId, 'New Title');

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(false);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_OWNER');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with invalid location', async () => {
      const event = createDraftEvent();
      const invalidLocation = {
        city: '',
        country: 'Tunisia',
      };
      const command = new UpdateEventCommand(eventId, userId, undefined, undefined, undefined, invalidLocation);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_LOCATION');
    });

    it('should fail with invalid date range', async () => {
      const event = createDraftEvent();
      const startDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      const command = new UpdateEventCommand(eventId, userId, undefined, undefined, undefined, undefined, startDate, endDate);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('Status-Based Modification Rules', () => {
    it('should prevent location change on PUBLISHED event', async () => {
      const event = createDraftEvent();
      
      const ticketTypeResult = TicketTypeEntity.create({
        eventId,
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

      const newLocation = {
        city: 'Sousse',
        country: 'Tunisia',
      };
      const command = new UpdateEventCommand(eventId, userId, undefined, undefined, undefined, newLocation);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('CANNOT_MODIFY');
    });

    it('should allow title/description change on PUBLISHED event', async () => {
      const event = createDraftEvent();
      
      const ticketTypeResult = TicketTypeEntity.create({
        eventId,
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

      const command = new UpdateEventCommand(eventId, userId, 'Updated Title', 'Updated description');

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Persistence Errors', () => {
    it('should fail when repository save throws error', async () => {
      const event = createDraftEvent();
      const command = new UpdateEventCommand(eventId, userId, 'New Title');

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(mockEventPublisher.publishFromAggregate).not.toHaveBeenCalled();
    });
  });
});
