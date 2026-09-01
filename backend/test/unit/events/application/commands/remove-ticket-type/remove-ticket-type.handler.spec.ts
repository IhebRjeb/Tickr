

import {
  RemoveTicketTypeCommand,
  RemoveTicketTypeHandler,
} from '@modules/events/application/commands/remove-ticket-type';
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

describe('RemoveTicketTypeHandler', () => {
  let handler: RemoveTicketTypeHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;
  let mockUserValidationService: jest.Mocked<UserValidationServicePort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const userId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const eventId = 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e';

  beforeEach(() => {
    mockEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockUserValidationService = {
      isEventOwner: jest.fn(),
    } as any;

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new RemoveTicketTypeHandler(
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

  const createDraftEventWithTicketType = (): EventEntity => {
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
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value;

    const ticketTypeResult = TicketTypeEntity.create({
      eventId,
      name: 'VIP Ticket',
      price: TicketPriceVO.create(150, Currency.TND),
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
    it('should remove ticket type from DRAFT event successfully', async () => {
      const event = createDraftEventWithTicketType();
      const ticketTypeId = event.ticketTypes[0].id;
      const command = new RemoveTicketTypeCommand(eventId, ticketTypeId, userId);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockEventRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should remove ticket type with no sales', async () => {
      const event = createDraftEventWithTicketType();
      const ticketType = event.ticketTypes[0];
      const command = new RemoveTicketTypeCommand(eventId, ticketType.id, userId);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should fail when event not found', async () => {
      const command = new RemoveTicketTypeCommand(eventId, 'ticket-123', userId);
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when user is not owner', async () => {
      const event = createDraftEventWithTicketType();
      const command = new RemoveTicketTypeCommand(eventId, event.ticketTypes[0].id, 'other-user');

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(false);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_OWNER');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when ticket type not found', async () => {
      const event = createDraftEventWithTicketType();
      const command = new RemoveTicketTypeCommand(eventId, 'non-existent-id', userId);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TICKET_TYPE_NOT_FOUND');
    });
  });

  describe('Business Rules', () => {
    it('should fail when event is PUBLISHED', async () => {
      const event = createDraftEventWithTicketType();
      event.publish();

      const command = new RemoveTicketTypeCommand(eventId, event.ticketTypes[0].id, userId);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_DRAFT');
    });

    it('should fail when ticket type has sales', async () => {
      const event = createDraftEventWithTicketType();
      const ticketType = event.ticketTypes[0];
      ticketType.incrementSold(5);

      const command = new RemoveTicketTypeCommand(eventId, ticketType.id, userId);

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('HAS_SALES');
    });
  });

  describe('Persistence Errors', () => {
    it('should fail when save throws error', async () => {
      const event = createDraftEventWithTicketType();
      const command = new RemoveTicketTypeCommand(eventId, event.ticketTypes[0].id, userId);

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
