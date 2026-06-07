
import { ProcessPaymentCommand } from '@modules/payments/application/commands/process-payment/process-payment.command';
import { ProcessPaymentHandler } from '@modules/payments/application/commands/process-payment/process-payment.handler';
import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentProviderFactoryPort, PaymentProviderPort } from '@modules/payments/application/ports/payment-provider.port';
import type { PaymentRepositoryPort } from '@modules/payments/application/ports/payment.repository.port';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('ProcessPaymentHandler', () => {
  let handler: ProcessPaymentHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;
  let mockPaymentRepo: jest.Mocked<PaymentRepositoryPort>;
  let mockProviderFactory: jest.Mocked<PaymentProviderFactoryPort>;
  let mockProvider: jest.Mocked<PaymentProviderPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  function createMockOrder(overrides: Partial<{
    id: string;
    userId: string;
    status: OrderStatus;
    expiresAt: Date;
  }> = {}): OrderEntity {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 15);

    return OrderEntity.reconstitute({
      id: overrides.id || validOrderId,
      userId: overrides.userId || validUserId,
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: overrides.status || OrderStatus.PENDING,
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
      expiresAt: overrides.expiresAt || futureDate,
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

    mockPaymentRepo = {
      save: jest.fn().mockImplementation((payment) => Promise.resolve(payment)),
      findByOrderId: jest.fn().mockResolvedValue([]),
      countByOrderId: jest.fn().mockResolvedValue(0),
    };

    mockProvider = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        id: 'pi_123',
        paymentUrl: 'https://pay.example.com/pi_123',
        clientSecret: 'secret_123',
        status: 'pending',
      }),
      confirmPayment: jest.fn(),
      refund: jest.fn(),
      verifyWebhook: jest.fn(),
    };

    mockProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      getSupportedMethods: jest.fn().mockReturnValue([PaymentMethod.STRIPE]),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn(),
    } as any;

    handler = new ProcessPaymentHandler(
      mockOrderRepo,
      mockPaymentRepo,
      mockProviderFactory,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    it('should process payment successfully for PENDING order', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentUrl).toBe('https://pay.example.com/pi_123');
      expect(result.value!.clientSecret).toBe('secret_123');
      expect(result.value!.orderId).toBe(validOrderId);
      expect(result.value!.gatewayRef).toBe('pi_123');
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(PaymentMethod.STRIPE);
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(order);
      expect(mockPaymentRepo.save).toHaveBeenCalled();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishMany).toHaveBeenCalled();
    });

    it('should allow retry for PROCESSING order', async () => {
      const order = createMockOrder({ status: OrderStatus.PROCESSING });
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.countByOrderId.mockResolvedValue(1);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if user does not own order', async () => {
      const order = createMockOrder({ userId: '550e8400-e29b-41d4-a716-446655440099' });
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should fail if order is expired', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);
      const order = createMockOrder({ expiresAt: pastDate });
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_EXPIRED');
    });

    it('should fail if order is in invalid status', async () => {
      const order = createMockOrder({ status: OrderStatus.PAID });
      mockOrderRepo.findById.mockResolvedValue(order);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('INVALID_STATUS');
    });

    it('should fail if max payment attempts exceeded', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.countByOrderId.mockResolvedValue(3);

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('MAX_ATTEMPTS_EXCEEDED');
    });

    it('should fail if gateway returns error', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);
      mockProvider.createPaymentIntent.mockRejectedValue(new Error('Gateway timeout'));

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('GATEWAY_ERROR');
    });

    it('should fail if persistence fails', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);
      mockPaymentRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new ProcessPaymentCommand(
        validOrderId,
        validUserId,
        PaymentMethod.STRIPE,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
