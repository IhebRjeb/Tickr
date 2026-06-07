
import { ConfirmPaymentCommand } from '@modules/payments/application/commands/confirm-payment/confirm-payment.command';
import { ConfirmPaymentHandler } from '@modules/payments/application/commands/confirm-payment/confirm-payment.handler';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentRepositoryPort } from '@modules/payments/application/ports/payment.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { PaymentStatus } from '@modules/payments/domain/value-objects/payment-status.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('ConfirmPaymentHandler', () => {
  let handler: ConfirmPaymentHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockPaymentRepo: jest.Mocked<PaymentRepositoryPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  function createMockOrder(status: OrderStatus = OrderStatus.PROCESSING): OrderEntity {
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
      paymentFeesAmount: 0,
      totalAmount: 104,
      currency: 'TND',
      paymentMethod: PaymentMethod.STRIPE,
      paymentGatewayOrderId: null,
      paymentIntentId: 'pi_123',
      gatewayPaymentRef: 'pi_123',
      transactionId: null,
      paidAt: null,
      refundedAt: null,
      refundReason: null,
      expiresAt: futureDate,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  function createMockPayment(status: PaymentStatus = PaymentStatus.PENDING): PaymentEntity {
    return PaymentEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      orderId: validOrderId,
      amountValue: 104,
      amountCurrency: 'TND',
      provider: PaymentMethod.STRIPE,
      status,
      gatewayResponse: null,
      gatewayPaymentRef: 'pi_123',
      paymentUrl: null,
      clientSecret: null,
      errorCode: null,
      errorMessage: null,
      attemptNumber: 1,
      createdAt: new Date(),
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

    mockPaymentRepo = {
      save: jest.fn().mockImplementation((payment) => Promise.resolve(payment)),
      findByOrderId: jest.fn().mockResolvedValue([createMockPayment()]),
      countByOrderId: jest.fn().mockResolvedValue(1),
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

    handler = new ConfirmPaymentHandler(
      mockOrderRepo,
      mockPaymentRepo,
      mockTicketReservation,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it('should confirm payment successfully', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockPaymentRepo.save).toHaveBeenCalled();
      expect(mockTicketReservation.confirmTickets).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if order is not in PROCESSING status', async () => {
      const order = createMockOrder(OrderStatus.PENDING);
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('INVALID_STATUS');
    });

    it('should succeed even if ticket confirmation fails', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockTicketReservation.confirmTickets.mockRejectedValue(new Error('Ticket service down'));

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      // Payment confirmation should still succeed
      expect(result.isSuccess).toBe(true);
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('should fail if persistence fails', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockOrderRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('PERSISTENCE_ERROR');
    });

    it('should handle case where no pending payment exists', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.findByOrderId.mockResolvedValue([createMockPayment(PaymentStatus.FAILED)]);

      const command = new ConfirmPaymentCommand(
        validOrderId,
        'pi_123',
        'txn_456',
        { status: 'succeeded' },
      );

      const result = await handler.execute(command);

      // Should still succeed — order gets paid
      expect(result.isSuccess).toBe(true);
    });
  });
});
