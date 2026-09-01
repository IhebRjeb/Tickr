

import {
  AddTicketTypeCommand,
  AddTicketTypeHandler,
} from '@modules/events/application/commands/add-ticket-type';
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

describe('AddTicketTypeHandler', () => {
  let handler: AddTicketTypeHandler;
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
      isEventOwner: jest.fn(),
    } as any;

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
    } as any;

    handler = new AddTicketTypeHandler(
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
      title: 'Test Event',
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    return result.value;
  };

  const createValidCommand = (overrides?: Partial<AddTicketTypeCommand>): AddTicketTypeCommand => {
    return new AddTicketTypeCommand(
      overrides?.eventId ?? eventId,
      overrides?.userId ?? userId,
      overrides?.name ?? 'VIP Ticket',
      overrides?.price ?? 150.0,
      overrides?.currency ?? Currency.TND,
      overrides?.quantity ?? 100,
      overrides?.salesStartDate ?? new Date('2026-06-01T00:00:00Z'),
      overrides?.salesEndDate ?? new Date('2026-07-14T23:59:59Z'),
      overrides?.description ?? 'VIP access',
      overrides?.isActive ?? true,
    );
  };

  describe('Success Cases', () => {
    it('should add ticket type successfully', async () => {
      const event = createDraftEvent();
      const command = createValidCommand();

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.ticketTypeId).toBeDefined();
      expect(mockEventRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should add ticket type without optional description', async () => {
      const event = createDraftEvent();
      const command = new AddTicketTypeCommand(
        eventId,
        userId,
        'Regular Ticket',
        50.0,
        Currency.TND,
        200,
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-07-14T23:59:59Z'),
      );

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should add multiple ticket types to same event', async () => {
      const event = createDraftEvent();

      for (let i = 0; i < 3; i++) {
        const command = createValidCommand({
          name: `Ticket Type ${i + 1}`,
          price: 50 * (i + 1),
        });

        mockEventRepository.findById.mockResolvedValue(event);
        mockUserValidationService.isEventOwner.mockReturnValue(true);
        mockEventRepository.save.mockResolvedValue(event);

        const result = await handler.execute(command);
        expect(result.isSuccess).toBe(true);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should fail when event not found', async () => {
      const command = createValidCommand();
      mockEventRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('EVENT_NOT_FOUND');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when user is not the owner', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ userId: differentUserId });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(false);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_OWNER');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with invalid price (zero)', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ price: 0 });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_PRICE');
    });

    it('should fail with invalid price (negative)', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ price: -50 });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_PRICE');
    });

    it('should fail with invalid sales period (end before start)', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({
        salesStartDate: new Date('2026-07-01T00:00:00Z'),
        salesEndDate: new Date('2026-06-01T00:00:00Z'),
      });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SALES_PERIOD');
    });

    it('should fail with sales end after event start', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({
        salesEndDate: new Date(event.dateRange.startDate.getTime() + 24 * 60 * 60 * 1000),
      });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_SALES_PERIOD');
    });
  });

  describe('Domain Business Rules', () => {
    it('should fail when max ticket types reached (10)', async () => {
      const event = createDraftEvent();

      for (let i = 0; i < 10; i++) {
        event.addTicketType(
          TicketTypeEntity.create({
            eventId,
            name: `Type ${i}`,
            price: TicketPriceVO.create(50, Currency.TND),
            quantity: 100,
            salesPeriod: SalesPeriodVO.create(
              new Date('2026-06-01'),
              new Date('2026-07-14'),
            ),
          }).value,
        );
      }

      const command = createValidCommand({ name: 'Extra Type' });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('MAX_TICKET_TYPES_REACHED');
    });

    it('should fail with duplicate ticket type name', async () => {
      const event = createDraftEvent();
      const ticketType = TicketTypeEntity.create({
        eventId,
        name: 'VIP Ticket',
        price: TicketPriceVO.create(100, Currency.TND),
        quantity: 50,
        salesPeriod: SalesPeriodVO.create(
          new Date('2026-06-01'),
          new Date('2026-07-14'),
        ),
      }).value;
      event.addTicketType(ticketType);

      const command = createValidCommand({ name: 'VIP Ticket' });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('DUPLICATE_NAME');
    });
  });

  describe('Currency Support', () => {
    it('should add ticket type with TND currency', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ currency: Currency.TND });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should add ticket type with EUR currency', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ currency: Currency.EUR });

      mockEventRepository.findById.mockResolvedValue(event);
      mockUserValidationService.isEventOwner.mockReturnValue(true);
      mockEventRepository.save.mockResolvedValue(event);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should add ticket type with USD currency', async () => {
      const event = createDraftEvent();
      const command = createValidCommand({ currency: Currency.USD });

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
      const command = createValidCommand();

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
