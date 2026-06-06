import { ConfigService } from '@nestjs/config';

import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { CreateOrderCommand } from '@modules/payments/application/commands/create-order/create-order.command';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';

import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import type { FraudDetectionPort } from '@modules/payments/application/ports/fraud-detection.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockEventQuery: jest.Mocked<PaymentEventQueryPort>;
  let mockFraudDetection: jest.Mocked<FraudDetectionPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440000';
  const validEventId = '550e8400-e29b-41d4-a716-446655440001';
  const validTicketTypeId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      countByUserIdSince: jest.fn(),
    };

    mockEventQuery = {
      getEventById: jest.fn().mockResolvedValue({
        id: validEventId,
        title: 'Test Event',
        status: 'PUBLISHED',
        startDate: new Date('2026-07-01'),
        organizerId: '550e8400-e29b-41d4-a716-446655440010',
      }),
      getTicketType: jest.fn().mockResolvedValue({
        id: validTicketTypeId,
        name: 'Standard',
        price: 50,
        currency: 'TND',
        available: 100,
      }),
    };

    mockFraudDetection = {
      checkRateLimit: jest.fn().mockResolvedValue(true),
      checkTicketLimit: jest.fn().mockResolvedValue(true),
      isHighValueOrder: jest.fn().mockReturnValue(false),
    };

    mockTicketReservation = {
      reserveTickets: jest.fn().mockResolvedValue({
        ticketIds: ['t1', 't2'],
        reservedUntil: new Date(),
      }),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
        if (key === 'PLATFORM_COMMISSION_RATE') return 0.04;
        if (key === 'ORDER_EXPIRATION_MINUTES') return 15;
        return defaultValue;
      }),
    } as any;

    handler = new CreateOrderHandler(
      mockOrderRepo,
      mockEventQuery,
      mockFraudDetection,
      mockTicketReservation,
      mockEventPublisher,
      mockConfigService,
    );
  });

  function createValidCommand(): CreateOrderCommand {
    return new CreateOrderCommand(
      validUserId,
      validEventId,
      [
        {
          ticketTypeId: validTicketTypeId,
          quantity: 2,
          holders: [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Doe', email: 'jane@example.com' },
          ],
        },
      ],
      { holderFirstName: 'John', holderLastName: 'Doe', holderEmail: 'john@example.com' },
    );
  }

  it('should create order successfully', async () => {
    const result = await handler.execute(createValidCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value.orderId).toBeDefined();
    expect(result.value.subtotal).toBe(100); // 50 × 2
    expect(result.value.platformFee).toBe(4); // 100 × 0.04
    expect(result.value.total).toBe(104);
    expect(result.value.currency).toBe('TND');
    expect(result.value.expiresAt).toBeInstanceOf(Date);
  });

  it('should save order to repository', async () => {
    await handler.execute(createValidCommand());

    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should publish domain events', async () => {
    await handler.execute(createValidCommand());

    expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
  });

  it('should reserve tickets via port', async () => {
    await handler.execute(createValidCommand());

    expect(mockTicketReservation.reserveTickets).toHaveBeenCalledWith(
      validEventId,
      validTicketTypeId,
      validUserId,
      2,
      [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' },
      ],
    );
  });

  it('should fail when rate limited', async () => {
    mockFraudDetection.checkRateLimit.mockResolvedValue(false);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('RATE_LIMITED');
  });

  it('should fail when event not found', async () => {
    mockEventQuery.getEventById.mockResolvedValue(null);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('EVENT_NOT_FOUND');
  });

  it('should fail when event not published', async () => {
    mockEventQuery.getEventById.mockResolvedValue({
      id: validEventId,
      title: 'Draft Event',
      status: 'DRAFT',
      startDate: new Date(),
      organizerId: 'org-1',
    });

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('EVENT_NOT_PUBLISHED');
  });

  it('should fail when ticket type not found', async () => {
    mockEventQuery.getTicketType.mockResolvedValue(null);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('TICKET_TYPE_NOT_FOUND');
  });

  it('should fail when insufficient availability', async () => {
    mockEventQuery.getTicketType.mockResolvedValue({
      id: validTicketTypeId,
      name: 'Standard',
      price: 50,
      currency: 'TND',
      available: 1, // only 1 available, requesting 2
    });

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('INSUFFICIENT_AVAILABILITY');
  });

  it('should fail when ticket limit exceeded', async () => {
    mockFraudDetection.checkTicketLimit.mockResolvedValue(false);

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('TICKET_LIMIT_EXCEEDED');
  });

  it('should fail when ticket reservation fails', async () => {
    mockTicketReservation.reserveTickets.mockRejectedValue(new Error('Reservation failed'));

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('INSUFFICIENT_AVAILABILITY');
  });

  it('should fail when persistence fails', async () => {
    mockOrderRepo.save.mockRejectedValue(new Error('DB error'));

    const result = await handler.execute(createValidCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error!.type).toBe('PERSISTENCE_ERROR');
  });
});
