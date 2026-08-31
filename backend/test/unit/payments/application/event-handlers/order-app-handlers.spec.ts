import { OrderFailedAppHandler } from '@modules/payments/application/event-handlers/order-failed-app.handler';
import { OrderPaidAppHandler } from '@modules/payments/application/event-handlers/order-paid-app.handler';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import type { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderFailedEvent } from '@modules/payments/domain/events/order-failed.event';
import { OrderPaidEvent } from '@modules/payments/domain/events/order-paid.event';

describe('OrderPaidAppHandler', () => {
  let handler: OrderPaidAppHandler;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;

  beforeEach(() => {
    mockTicketReservation = {
      reserveTickets: jest.fn(),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      findByGatewayRef: jest.fn(),
    } as any;

    handler = new OrderPaidAppHandler(mockTicketReservation, mockOrderRepository);
  });

  it('should confirm tickets on successful payment', async () => {
    const mockOrder = {
      items: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
    } as unknown as OrderEntity;
    mockOrderRepository.findById.mockResolvedValue(mockOrder);

    const event = new OrderPaidEvent(
      'order-123', 'user-1', 'event-1', 'txn_123', 100, 'TND', 4, 96, 2,
    );

    await handler.handle(event);

    expect(mockTicketReservation.confirmTickets).toHaveBeenCalledWith(
      ['ticket-1', 'ticket-2'],
      'order-123',
    );
  });

  it('should handle order not found gracefully', async () => {
    mockOrderRepository.findById.mockResolvedValue(null);

    const event = new OrderPaidEvent(
      'order-missing', 'user-1', 'event-1', 'txn_123', 100, 'TND', 4, 96, 2,
    );

    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(mockTicketReservation.confirmTickets).not.toHaveBeenCalled();
  });

  it('should catch ticket confirmation errors without re-throwing', async () => {
    const mockOrder = { items: [{ id: 'ticket-1' }] } as unknown as OrderEntity;
    mockOrderRepository.findById.mockResolvedValue(mockOrder);
    mockTicketReservation.confirmTickets.mockRejectedValue(new Error('Ticket service down'));

    const event = new OrderPaidEvent(
      'order-123', 'user-1', 'event-1', 'txn_123', 100, 'TND', 4, 96, 1,
    );

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });
});

describe('OrderFailedAppHandler', () => {
  let handler: OrderFailedAppHandler;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;

  beforeEach(() => {
    mockTicketReservation = {
      reserveTickets: jest.fn(),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };
    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      findByGatewayRef: jest.fn(),
    } as any;

    handler = new OrderFailedAppHandler(mockTicketReservation, mockOrderRepository);
  });

  it('should release tickets on payment failure', async () => {
    const mockOrder = {
      items: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
    } as unknown as OrderEntity;
    mockOrderRepository.findById.mockResolvedValue(mockOrder);

    const event = new OrderFailedEvent('order-123', 'user-1', 'event-1', 'Card declined');

    await handler.handle(event);

    expect(mockTicketReservation.cancelReservations).toHaveBeenCalledWith(
      ['ticket-1', 'ticket-2'],
    );
  });

  it('should handle order not found gracefully', async () => {
    mockOrderRepository.findById.mockResolvedValue(null);

    const event = new OrderFailedEvent('order-missing', 'user-1', 'event-1', 'Error');

    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(mockTicketReservation.cancelReservations).not.toHaveBeenCalled();
  });

  it('should catch ticket release errors without re-throwing', async () => {
    const mockOrder = { items: [{ id: 'ticket-1' }] } as unknown as OrderEntity;
    mockOrderRepository.findById.mockResolvedValue(mockOrder);
    mockTicketReservation.cancelReservations.mockRejectedValue(new Error('Timeout'));

    const event = new OrderFailedEvent('order-123', 'user-1', 'event-1', 'Failed');

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });
});
