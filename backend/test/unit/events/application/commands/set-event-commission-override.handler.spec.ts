import { SetEventCommissionOverrideCommand } from '@modules/events/application/commands/set-event-commission-override/set-event-commission-override.command';
import { SetEventCommissionOverrideHandler } from '@modules/events/application/commands/set-event-commission-override/set-event-commission-override.handler';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import type { UserValidationServicePort } from '@modules/events/application/ports/user-validation.service.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { ConfigService } from '@nestjs/config';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

describe('SetEventCommissionOverrideHandler', () => {
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const adminId = '550e8400-e29b-41d4-a716-446655440002';
  let event: EventEntity;
  let eventRepository: jest.Mocked<EventRepositoryPort>;
  let userValidationService: jest.Mocked<UserValidationServicePort>;
  let eventPublisher: jest.Mocked<DomainEventPublisherPort>;
  let handler: SetEventCommissionOverrideHandler;

  beforeEach(() => {
    const startDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    event = EventEntity.create({
      id: eventId,
      organizerId: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Test Event',
      category: EventCategory.CONCERT,
      location: LocationVO.create({ city: 'Tunis', country: 'Tunisia' }),
      dateRange: EventDateRangeVO.create(startDate, endDate),
    }).value;

    eventRepository = {
      findById: jest.fn().mockResolvedValue(event),
      save: jest.fn().mockImplementation(async (value) => value),
    } as unknown as jest.Mocked<EventRepositoryPort>;
    userValidationService = {
      hasRole: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<UserValidationServicePort>;
    eventPublisher = {
      publishFromAggregate: jest.fn(),
    } as unknown as jest.Mocked<DomainEventPublisherPort>;
    const configService = {
      get: jest.fn((key: string, defaultValue?: number) =>
        key === 'payments.commission.rate' ? 0.06 : defaultValue,
      ),
    } as unknown as ConfigService;

    handler = new SetEventCommissionOverrideHandler(
      eventRepository,
      userValidationService,
      eventPublisher,
      configService,
    );
  });

  it('should set an event commission override for an admin', async () => {
    const result = await handler.execute(
      new SetEventCommissionOverrideCommand(eventId, adminId, 0.03),
    );

    expect(result.value).toEqual({
      eventId,
      commissionRateOverride: 0.03,
      effectiveCommissionRate: 0.03,
      usesGlobalRate: false,
    });
    expect(eventRepository.save).toHaveBeenCalledWith(event);
    expect(eventPublisher.publishFromAggregate).toHaveBeenCalledWith(event);
  });

  it('should clear the override and restore the global rate', async () => {
    event.setCommissionRateOverride(0.02, adminId);

    const result = await handler.execute(
      new SetEventCommissionOverrideCommand(eventId, adminId, null),
    );

    expect(result.value).toEqual({
      eventId,
      commissionRateOverride: null,
      effectiveCommissionRate: 0.06,
      usesGlobalRate: true,
    });
  });

  it('should reject a non-admin before loading the event', async () => {
    userValidationService.hasRole.mockResolvedValue(false);

    const result = await handler.execute(
      new SetEventCommissionOverrideCommand(eventId, adminId, 0.03),
    );

    expect(result.error?.type).toBe('ACCESS_DENIED');
    expect(eventRepository.findById).not.toHaveBeenCalled();
  });

  it('should reject an invalid override', async () => {
    const result = await handler.execute(
      new SetEventCommissionOverrideCommand(eventId, adminId, 0.25),
    );

    expect(result.error?.type).toBe('INVALID_COMMISSION_RATE');
    expect(eventRepository.save).not.toHaveBeenCalled();
  });
});