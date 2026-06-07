
import { RequestRefundCommand } from '@modules/payments/application/commands/request-refund/request-refund.command';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentProviderFactoryPort, PaymentProviderPort } from '@modules/payments/application/ports/payment-provider.port';
import type { RefundRepositoryPort } from '@modules/payments/application/ports/refund.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('RequestRefundHandler', () => {
  let handler: RequestRefundHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockRefundRepo: jest.Mocked<RefundRepositoryPort>;
  let mockProviderFactory: jest.Mocked<PaymentProviderFactoryPort>;
  let mockProvider: jest.Mocked<PaymentProviderPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  function createMockOrder(status: OrderStatus = OrderStatus.PAID): OrderEntity {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 15);

    return OrderEntity.reconstitute({
      id: validOrderId,
      userId: validUserId,
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status,
      subtotalAmount: 100,
      platformFeeAmount: 4,
      paymentFeesAmount: 2,
      totalAmount: 106,
      currency: 'TND',
      paymentMethod: PaymentMethod.STRIPE,
      paymentGatewayOrderId: null,
      paymentIntentId: 'pi_123',
      gatewayPaymentRef: 'pi_123',
      transactionId: 'txn_456',
      paidAt: new Date(),
      refundedAt: null,
      refundReason: null,
      expiresAt: futureDate,
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
      findExpired: jest.fn(),
      countByUserIdSince: jest.fn(),
    };

    mockRefundRepo = {
      save: jest.fn().mockImplementation((refund) => Promise.resolve(refund)),
      findByOrderId: jest.fn().mockResolvedValue([]),
    };

    mockProvider = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      refund: jest.fn().mockResolvedValue({
        success: true,
        refundId: 're_789',
        amount: 102,
      }),
      verifyWebhook: jest.fn(),
    };

    mockProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      getSupportedMethods: jest.fn(),
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

    handler = new RequestRefundHandler(
      mockOrderRepo,
      mockRefundRepo,
      mockProviderFactory,
      mockTicketReservation,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it('should process refund successfully', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.refundId).toBeDefined();
      expect(mockProvider.refund).toHaveBeenCalled();
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalled();
      expect(mockRefundRepo.save).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if order is not in PAID status', async () => {
      const order = createMockOrder(OrderStatus.PENDING);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Changed my mind',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('INVALID_STATUS');
    });

    it('should handle gateway refund failure gracefully', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProvider.refund.mockRejectedValue(new Error('Gateway error'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      // Should still succeed — refund marked pending for manual processing
      expect(result.isSuccess).toBe(true);
    });

    it('should handle ticket cancellation failure gracefully', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockTicketReservation.cancelReservations.mockRejectedValue(new Error('Ticket service down'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      // Should still succeed — refund processed
      expect(result.isSuccess).toBe(true);
    });

    it('should fail if persistence fails', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockRefundRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new RequestRefundCommand(
        validOrderId,
        validUserId,
        'Event cancelled',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
