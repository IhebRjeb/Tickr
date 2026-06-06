/**
 * @file Payments Module Integration Tests
 * @description Tests the order lifecycle, payment flow, and refund processing
 *              with mocked infrastructure but real domain logic.
 */

import { Logger } from '@nestjs/common';

import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';
import { CreateOrderCommand } from '@modules/payments/application/commands/create-order/create-order.command';
import { ProcessPaymentHandler } from '@modules/payments/application/commands/process-payment/process-payment.handler';
import { ProcessPaymentCommand } from '@modules/payments/application/commands/process-payment/process-payment.command';
import { ConfirmPaymentHandler } from '@modules/payments/application/commands/confirm-payment/confirm-payment.handler';
import { ConfirmPaymentCommand } from '@modules/payments/application/commands/confirm-payment/confirm-payment.command';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import { RequestRefundCommand } from '@modules/payments/application/commands/request-refund/request-refund.command';
import { ExpireOrdersHandler } from '@modules/payments/application/commands/expire-orders/expire-orders.handler';

import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import type { PaymentRepositoryPort } from '@modules/payments/application/ports/payment.repository.port';
import type { RefundRepositoryPort } from '@modules/payments/application/ports/refund.repository.port';
import type { FraudDetectionPort } from '@modules/payments/application/ports/fraud-detection.port';
import type { PaymentEventQueryPort } from '@modules/payments/application/ports/event-query.port';
import type { TicketReservationPort } from '@modules/payments/application/ports/ticket-reservation.port';
import type { PaymentProviderFactoryPort, PaymentProviderPort } from '@modules/payments/application/ports/payment-provider.port';

// ============================================
// In-Memory Repositories
// ============================================

class InMemoryOrderRepository implements OrderRepositoryPort {
  private orders: OrderEntity[] = [];

  async save(order: OrderEntity): Promise<OrderEntity> {
    const idx = this.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.orders[idx] = order;
    } else {
      this.orders.push(order);
    }
    return order;
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orders.find((o) => o.id === id) || null;
  }

  async findByUserId(userId: string, _page: number, _limit: number) {
    const matching = this.orders.filter((o) => o.userId === userId);
    return { orders: matching, total: matching.length };
  }

  async findByEventId(eventId: string, _page: number, _limit: number) {
    const matching = this.orders.filter((o) => o.eventId === eventId);
    return { orders: matching, total: matching.length };
  }

  async findExpired(): Promise<OrderEntity[]> {
    const now = new Date();
    return this.orders.filter(
      (o) => o.status === OrderStatus.PENDING && o.expiresAt < now,
    );
  }

  async findByGatewayRef(ref: string): Promise<OrderEntity | null> {
    return this.orders.find((o) => o.gatewayPaymentRef === ref) || null;
  }

  getAll(): OrderEntity[] {
    return this.orders;
  }
}

// ============================================
// Test UUIDs
// ============================================

const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';
const TEST_EVENT_ID = '00000000-0000-4000-a000-000000000002';
const TEST_ORGANIZER_ID = '00000000-0000-4000-a000-000000000003';
const TEST_TICKET_TYPE_ID = '00000000-0000-4000-a000-000000000004';

// ============================================
// Mock Providers
// ============================================

function createMockFraudDetection(): FraudDetectionPort {
  return {
    checkRateLimit: jest.fn().mockResolvedValue(true),
    checkTicketLimit: jest.fn().mockResolvedValue(true),
    isHighValueOrder: jest.fn().mockReturnValue(false),
  };
}

function createMockEventQuery(): PaymentEventQueryPort {
  return {
    getEventById: jest.fn().mockResolvedValue({
      id: TEST_EVENT_ID,
      title: 'Test Event',
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86400000),
      organizerId: TEST_ORGANIZER_ID,
    }),
    getTicketType: jest.fn().mockResolvedValue({
      id: TEST_TICKET_TYPE_ID,
      name: 'Standard',
      price: 50,
      currency: 'TND',
      available: 100,
    }),
  };
}

function createMockTicketReservation(): jest.Mocked<TicketReservationPort> {
  return {
    reserveTickets: jest.fn().mockResolvedValue({
      ticketIds: ['ticket-1', 'ticket-2'],
      reservedUntil: new Date(Date.now() + 900000),
    }),
    confirmTickets: jest.fn().mockResolvedValue(undefined),
    cancelReservations: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockPaymentProvider(): jest.Mocked<PaymentProviderPort> {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'gateway-ref-123',
      paymentUrl: 'https://pay.test/abc',
      status: 'pending',
    }),
    confirmPayment: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'txn-123',
      amount: 104000,
      currency: 'TND',
    }),
    refund: jest.fn().mockResolvedValue({
      success: true,
      refundId: 'refund-123',
      amount: 100000,
    }),
    verifyWebhook: jest.fn().mockReturnValue(true),
  };
}

function createMockProviderFactory(provider: PaymentProviderPort): PaymentProviderFactoryPort {
  return {
    getProvider: jest.fn().mockReturnValue(provider),
    getSupportedMethods: jest.fn().mockReturnValue([PaymentMethod.KONNECT]),
  };
}

// ============================================
// Tests
// ============================================

describe('Payments Module - Integration Tests', () => {
  let orderRepository: InMemoryOrderRepository;
  let mockFraudDetection: FraudDetectionPort;
  let mockEventQuery: PaymentEventQueryPort;
  let mockTicketReservation: jest.Mocked<TicketReservationPort>;
  let mockProvider: jest.Mocked<PaymentProviderPort>;
  let mockProviderFactory: PaymentProviderFactoryPort;
  let mockEventPublisher: any;
  let mockPaymentRepository: jest.Mocked<PaymentRepositoryPort>;
  let mockRefundRepository: jest.Mocked<RefundRepositoryPort>;
  let mockConfigService: any;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  beforeEach(() => {
    orderRepository = new InMemoryOrderRepository();
    mockFraudDetection = createMockFraudDetection();
    mockEventQuery = createMockEventQuery();
    mockTicketReservation = createMockTicketReservation();
    mockProvider = createMockPaymentProvider();
    mockProviderFactory = createMockProviderFactory(mockProvider);
    mockEventPublisher = { publish: jest.fn(), publishMany: jest.fn(), publishMany: jest.fn() };
    mockPaymentRepository = { save: jest.fn(), findByOrderId: jest.fn().mockResolvedValue([]), findById: jest.fn(), countByOrderId: jest.fn().mockResolvedValue(0) } as any;
    mockRefundRepository = { save: jest.fn(), findByOrderId: jest.fn().mockResolvedValue([]) } as any;
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, def?: any) => {
        const map: Record<string, any> = {
          PLATFORM_COMMISSION_RATE: 0.04,
          ORDER_EXPIRATION_MINUTES: 15,
          'payments.order.maxItems': 10,
          'payments.retry.maxAttempts': 3,
        };
        return map[key] ?? def;
      }),
    };
  });

  describe('Order Lifecycle: Create → Pay → Confirm', () => {
    it('should complete full payment lifecycle', async () => {
      // 1. CREATE ORDER
      const createHandler = new CreateOrderHandler(
        orderRepository,
        mockEventQuery as any,
        mockFraudDetection as any,
        mockTicketReservation as any,
        mockEventPublisher,
        mockConfigService,
      );

      const createCommand = new CreateOrderCommand(
        TEST_USER_ID,
        TEST_EVENT_ID,
        [{ ticketTypeId: TEST_TICKET_TYPE_ID, quantity: 2, holders: [{ name: 'A', email: 'a@b.com' }, { name: 'B', email: 'b@b.com' }] }],
        { holderFirstName: 'Ahmed', holderLastName: 'Ben Ali', holderEmail: 'ahmed@test.com' },
      );

      const createResult = await createHandler.execute(createCommand);
      expect(createResult.isSuccess).toBe(true);

      const orderId = createResult.value!.orderId;
      const order = await orderRepository.findById(orderId);
      expect(order).not.toBeNull();
      expect(order!.status).toBe(OrderStatus.PENDING);

      // 2. PROCESS PAYMENT
      const processHandler = new ProcessPaymentHandler(
        orderRepository,
        mockPaymentRepository,
        mockProviderFactory as any,
        mockEventPublisher,
      );

      const processCommand = new ProcessPaymentCommand(
        orderId,
        TEST_USER_ID,
        PaymentMethod.KONNECT,
      );

      const processResult = await processHandler.execute(processCommand);
      expect(processResult.isSuccess).toBe(true);
      expect(processResult.value!.paymentUrl).toBe('https://pay.test/abc');

      // Order should now be PROCESSING
      const processingOrder = await orderRepository.findById(orderId);
      expect(processingOrder!.status).toBe(OrderStatus.PROCESSING);

      // 3. CONFIRM PAYMENT (webhook callback)
      const confirmHandler = new ConfirmPaymentHandler(
        orderRepository,
        mockPaymentRepository,
        mockTicketReservation,
        mockEventPublisher,
      );

      const confirmCommand = new ConfirmPaymentCommand(
        orderId,
        'gateway-ref-123',
        'txn-123',
        { gateway: 'konnect' },
      );

      const confirmResult = await confirmHandler.execute(confirmCommand);
      expect(confirmResult.isSuccess).toBe(true);

      // Order should now be PAID
      const paidOrder = await orderRepository.findById(orderId);
      expect(paidOrder!.status).toBe(OrderStatus.PAID);
    });
  });

  describe('Refund Flow', () => {
    it('should process refund for a paid order', async () => {
      // Setup: create a paid order directly
      const order = OrderEntity.reconstitute({
        id: 'order-paid-1',
        userId: TEST_USER_ID,
        eventId: TEST_EVENT_ID,
        items: [{ id: 'item-1', ticketTypeId: 'tt-1', ticketTypeName: 'Standard', quantity: 1, unitPrice: 50, lineTotal: 50 }],
        status: OrderStatus.PAID,
        subtotalAmount: 50,
        platformFeeAmount: 2,
        paymentFeesAmount: 0,
        totalAmount: 52,
        currency: 'TND',
        paymentMethod: PaymentMethod.KONNECT,
        paymentGatewayOrderId: null,
        paymentIntentId: 'pi-123',
        gatewayPaymentRef: 'gateway-ref-123',
        transactionId: 'txn-123',
        paidAt: new Date(),
        refundedAt: null,
        refundReason: null,
        expiresAt: new Date(Date.now() + 900000),
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await orderRepository.save(order);

      const refundHandler = new RequestRefundHandler(
        orderRepository,
        mockRefundRepository,
        mockProviderFactory as any,
        mockTicketReservation,
        mockEventPublisher,
      );

      const refundCommand = new RequestRefundCommand(
        'order-paid-1',
        TEST_USER_ID,
        'Event cancelled',
      );

      const refundResult = await refundHandler.execute(refundCommand);
      expect(refundResult.isSuccess).toBe(true);

      const refundedOrder = await orderRepository.findById('order-paid-1');
      expect(refundedOrder!.status).toBe(OrderStatus.REFUNDED);
    });
  });

  describe('Order Expiration', () => {
    it('should expire orders past their deadline', async () => {
      // Create an expired order
      const expiredOrder = OrderEntity.reconstitute({
        id: 'order-expired-1',
        userId: TEST_USER_ID,
        eventId: TEST_EVENT_ID,
        items: [{ id: 'item-1', ticketTypeId: 'tt-1', ticketTypeName: 'Standard', quantity: 1, unitPrice: 50, lineTotal: 50 }],
        status: OrderStatus.PENDING,
        subtotalAmount: 50,
        platformFeeAmount: 2,
        paymentFeesAmount: 0,
        totalAmount: 52,
        currency: 'TND',
        paymentMethod: null,
        paymentGatewayOrderId: null,
        paymentIntentId: null,
        gatewayPaymentRef: null,
        transactionId: null,
        paidAt: null,
        refundedAt: null,
        refundReason: null,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
        metadata: null,
        createdAt: new Date(Date.now() - 900000),
        updatedAt: new Date(Date.now() - 900000),
      });
      await orderRepository.save(expiredOrder);

      const expireHandler = new ExpireOrdersHandler(
        orderRepository,
        mockTicketReservation,
        mockEventPublisher,
      );

      const result = await expireHandler.execute();

      expect(result.expiredCount).toBe(1);

      const expired = await orderRepository.findById('order-expired-1');
      expect(expired!.status).toBe(OrderStatus.CANCELLED);
      expect(mockTicketReservation.cancelReservations).toHaveBeenCalled();
    });

    it('should not expire non-pending orders', async () => {
      const paidOrder = OrderEntity.reconstitute({
        id: 'order-paid-2',
        userId: TEST_USER_ID,
        eventId: TEST_EVENT_ID,
        items: [],
        status: OrderStatus.PAID,
        subtotalAmount: 50,
        platformFeeAmount: 2,
        paymentFeesAmount: 0,
        totalAmount: 52,
        currency: 'TND',
        paymentMethod: PaymentMethod.STRIPE,
        paymentGatewayOrderId: null,
        paymentIntentId: 'pi-1',
        gatewayPaymentRef: 'ref-1',
        transactionId: 'txn-1',
        paidAt: new Date(),
        refundedAt: null,
        refundReason: null,
        expiresAt: new Date(Date.now() - 60000),
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await orderRepository.save(paidOrder);

      const expireHandler = new ExpireOrdersHandler(
        orderRepository,
        mockTicketReservation,
        mockEventPublisher,
      );

      const result = await expireHandler.execute();

      expect(result.expiredCount).toBe(0);
    });
  });
});
