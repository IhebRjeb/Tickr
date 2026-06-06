import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { ExpireOrdersHandler } from '@modules/payments/application/commands/expire-orders/expire-orders.handler';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';

import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';

describe('ExpireOrdersHandler', () => {
  let handler: ExpireOrdersHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  function createExpiredOrder(id: string): OrderEntity {
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 5);

    return OrderEntity.reconstitute({
      id,
      userId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PENDING,
      subtotalAmount: 100,
      platformFeeAmount: 4,
      paymentFeesAmount: 0,
      totalAmount: 104,
      currency: 'TND',
      paymentMethod: null,
      paymentGatewayOrderId: null,
      paymentIntentId: null,
      gatewayPaymentRef: null,
      transactionId: null,
      paidAt: null,
      refundedAt: null,
      refundReason: null,
      expiresAt: pastDate,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn().mockResolvedValue([]),
      countByUserIdSince: jest.fn(),
    };

    mockTicketReservation = {
      reserveTickets: jest.fn(),
      confirmTickets: jest.fn(),
      cancelReservations: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn(),
    } as any;

    handler = new ExpireOrdersHandler(
      mockOrderRepo,
      mockTicketReservation,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it('should return 0 when no expired orders', async () => {
      mockOrderRepo.findExpired.mockResolvedValue([]);

      const result = await handler.execute();

      expect(result.expiredCount).toBe(0);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should expire multiple orders', async () => {
      const orders = [
        createExpiredOrder('550e8400-e29b-41d4-a716-446655440010'),
        createExpiredOrder('550e8400-e29b-41d4-a716-446655440011'),
      ];
      mockOrderRepo.findExpired.mockResolvedValue(orders);

      const result = await handler.execute();

      expect(result.expiredCount).toBe(2);
      expect(mockOrderRepo.save).toHaveBeenCalledTimes(2);
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalledTimes(2);
      expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(2);
    });

    it('should continue processing remaining orders if one fails', async () => {
      const orders = [
        createExpiredOrder('550e8400-e29b-41d4-a716-446655440010'),
        createExpiredOrder('550e8400-e29b-41d4-a716-446655440011'),
      ];
      mockOrderRepo.findExpired.mockResolvedValue(orders);
      mockOrderRepo.save
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(orders[1]);

      const result = await handler.execute();

      expect(result.expiredCount).toBe(1);
    });

    it('should expire order even if ticket release fails', async () => {
      const orders = [createExpiredOrder('550e8400-e29b-41d4-a716-446655440010')];
      mockOrderRepo.findExpired.mockResolvedValue(orders);
      mockTicketReservation.cancelReservations.mockRejectedValue(new Error('Ticket service down'));

      const result = await handler.execute();

      expect(result.expiredCount).toBe(1);
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('should skip orders that cannot be expired', async () => {
      // PROCESSING order can't use expire() — it checks for PENDING status
      const nonExpirableOrder = OrderEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440010',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        eventId: '550e8400-e29b-41d4-a716-446655440002',
        items: [],
        status: OrderStatus.PROCESSING,
        subtotalAmount: 100,
        platformFeeAmount: 4,
        paymentFeesAmount: 0,
        totalAmount: 104,
        currency: 'TND',
        paymentMethod: null,
        paymentGatewayOrderId: null,
        paymentIntentId: null,
        gatewayPaymentRef: null,
        transactionId: null,
        paidAt: null,
        refundedAt: null,
        refundReason: null,
        expiresAt: new Date(Date.now() - 60000),
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockOrderRepo.findExpired.mockResolvedValue([nonExpirableOrder]);

      const result = await handler.execute();

      expect(result.expiredCount).toBe(0);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });
  });
});
