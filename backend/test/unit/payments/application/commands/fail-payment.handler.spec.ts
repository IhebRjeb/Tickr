import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { FailPaymentCommand } from '@modules/payments/application/commands/fail-payment/fail-payment.command';
import { FailPaymentHandler } from '@modules/payments/application/commands/fail-payment/fail-payment.handler';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentStatus } from '@modules/payments/domain/value-objects/payment-status.vo';

import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentRepositoryPort } from '@modules/payments/application/ports/payment.repository.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';

describe('FailPaymentHandler', () => {
  let handler: FailPaymentHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockPaymentRepo: jest.Mocked<PaymentRepositoryPort>;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';

  function createMockOrder(status: OrderStatus = OrderStatus.PROCESSING): OrderEntity {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 15);

    return OrderEntity.reconstitute({
      id: validOrderId,
      userId: '550e8400-e29b-41d4-a716-446655440001',
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
      publishAll: jest.fn(),
    } as any;

    handler = new FailPaymentHandler(
      mockOrderRepo,
      mockPaymentRepo,
      mockTicketReservation,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it('should handle payment failure with retries remaining', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.findByOrderId.mockResolvedValue([createMockPayment()]);

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
        { decline_code: 'insufficient_funds' },
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.canRetry).toBe(true);
      expect(result.value!.attemptNumber).toBe(1);
      expect(mockPaymentRepo.save).toHaveBeenCalled();
      expect(mockTicketReservation.cancelReservations).not.toHaveBeenCalled();
    });

    it('should mark order as FAILED when max attempts reached', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);

      // 3 payments = max attempts reached
      const payments = [
        createMockPayment(PaymentStatus.FAILED),
        createMockPayment(PaymentStatus.FAILED),
        createMockPayment(PaymentStatus.PENDING),
      ];
      mockPaymentRepo.findByOrderId.mockResolvedValue(payments);

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.canRetry).toBe(false);
      expect(result.value!.attemptNumber).toBe(3);
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishAll).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if order cannot transition to FAILED', async () => {
      const order = createMockOrder(OrderStatus.PAID);
      mockOrderRepo.findById.mockResolvedValue(order);

      // 3 payments so it tries to markAsFailed
      const payments = [
        createMockPayment(PaymentStatus.FAILED),
        createMockPayment(PaymentStatus.FAILED),
        createMockPayment(PaymentStatus.PENDING),
      ];
      mockPaymentRepo.findByOrderId.mockResolvedValue(payments);

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('INVALID_STATUS');
    });

    it('should handle case where no pending payment exists', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.findByOrderId.mockResolvedValue([createMockPayment(PaymentStatus.FAILED)]);

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
      );

      const result = await handler.execute(command);

      // Should still succeed — just no payment to update
      expect(result.isSuccess).toBe(true);
    });

    it('should fail if persistence fails', async () => {
      const order = createMockOrder(OrderStatus.PROCESSING);
      mockOrderRepo.findById.mockResolvedValue(order);
      mockOrderRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new FailPaymentCommand(
        validOrderId,
        'card_declined',
        'Your card was declined',
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
