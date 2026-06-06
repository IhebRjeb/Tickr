import { Money } from '@shared/domain/value-objects/money.vo';

import { OrderEntity, CreateOrderProps } from '@modules/payments/domain/entities/order.entity';
import { OrderItemEntity } from '@modules/payments/domain/entities/order-item.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';

// ============================================
// Test Helpers
// ============================================

const validUserId = '550e8400-e29b-41d4-a716-446655440000';
const validEventId = '550e8400-e29b-41d4-a716-446655440001';

function createValidOrderProps(overrides?: Partial<CreateOrderProps>): CreateOrderProps {
  return {
    userId: validUserId,
    eventId: validEventId,
    items: [
      {
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
        ticketTypeName: 'Standard',
        price: Money.create(50, 'TND'),
        quantity: 2,
      },
    ],
    currency: 'TND',
    commissionRate: 0.04,
    expirationMinutes: 15,
    metadata: {
      holderFirstName: 'John',
      holderLastName: 'Doe',
      holderEmail: 'john@example.com',
    },
    ...overrides,
  };
}

function createPendingOrder(): OrderEntity {
  const result = OrderEntity.create(createValidOrderProps());
  return result.value;
}

// ============================================
// Tests
// ============================================

describe('OrderEntity', () => {
  describe('create', () => {
    it('should create a valid order', () => {
      const result = OrderEntity.create(createValidOrderProps());

      expect(result.isSuccess).toBe(true);
      const order = result.value;
      expect(order.id).toBeDefined();
      expect(order.userId).toBe(validUserId);
      expect(order.eventId).toBe(validEventId);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toHaveLength(1);
    });

    it('should calculate subtotal from items', () => {
      const result = OrderEntity.create(createValidOrderProps());
      const order = result.value;

      // 50 TND × 2 = 100 TND
      expect(order.subtotalAmount).toBe(100);
    });

    it('should calculate platform fee at 4%', () => {
      const result = OrderEntity.create(createValidOrderProps());
      const order = result.value;

      // 100 TND × 0.04 = 4 TND
      expect(order.platformFeeAmount).toBe(4);
    });

    it('should calculate total as subtotal + platform fee', () => {
      const result = OrderEntity.create(createValidOrderProps());
      const order = result.value;

      // 100 + 4 = 104 TND
      expect(order.totalAmount).toBe(104);
    });

    it('should set expiration time', () => {
      const before = new Date();
      const result = OrderEntity.create(createValidOrderProps());
      const order = result.value;

      const expectedExpiry = new Date(before.getTime() + 15 * 60 * 1000);
      // Allow 1 second tolerance
      expect(order.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(order.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it('should emit OrderCreated domain event', () => {
      const result = OrderEntity.create(createValidOrderProps());
      const order = result.value;
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderCreatedEvent');
    });

    it('should support multiple items', () => {
      const result = OrderEntity.create(createValidOrderProps({
        items: [
          { ticketTypeId: '550e8400-e29b-41d4-a716-446655440002', ticketTypeName: 'Standard', price: Money.create(50, 'TND'), quantity: 2 },
          { ticketTypeId: '550e8400-e29b-41d4-a716-446655440003', ticketTypeName: 'VIP', price: Money.create(150, 'TND'), quantity: 1 },
        ],
      }));

      const order = result.value;
      expect(order.items).toHaveLength(2);
      // subtotal: (50×2) + (150×1) = 250
      expect(order.subtotalAmount).toBe(250);
      // fee: 250 × 0.04 = 10
      expect(order.platformFeeAmount).toBe(10);
      // total: 250 + 10 = 260
      expect(order.totalAmount).toBe(260);
    });

    it('should fail with invalid userId', () => {
      const result = OrderEntity.create(createValidOrderProps({ userId: 'not-a-uuid' }));

      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('INVALID_ORDER');
    });

    it('should fail with invalid eventId', () => {
      const result = OrderEntity.create(createValidOrderProps({ eventId: 'bad' }));

      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('INVALID_ORDER');
    });

    it('should fail with empty items', () => {
      const result = OrderEntity.create(createValidOrderProps({ items: [] }));

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('at least 1 item');
    });

    it('should fail with more than 10 items', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        ticketTypeId: `550e8400-e29b-41d4-a716-44665544000${i}`,
        ticketTypeName: `Type ${i}`,
        price: Money.create(10, 'TND'),
        quantity: 1,
      }));
      const result = OrderEntity.create(createValidOrderProps({ items }));

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('more than 10');
    });

    it('should store metadata', () => {
      const metadata = { holderFirstName: 'Jane', holderLastName: 'Smith', holderEmail: 'jane@test.com' };
      const result = OrderEntity.create(createValidOrderProps({ metadata }));
      const order = result.value;

      expect(order.metadata).toEqual(metadata);
    });
  });

  describe('markAsProcessing', () => {
    it('should transition PENDING → PROCESSING', () => {
      const order = createPendingOrder();
      order.pullDomainEvents(); // clear creation event

      const result = order.markAsProcessing(PaymentMethod.KONNECT, 'ref_123');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.PROCESSING);
      expect(order.paymentMethod).toBe(PaymentMethod.KONNECT);
      expect(order.gatewayPaymentRef).toBe('ref_123');
    });

    it('should emit OrderProcessing event', () => {
      const order = createPendingOrder();
      order.pullDomainEvents();

      order.markAsProcessing(PaymentMethod.STRIPE, 'pi_123');
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderProcessingEvent');
    });

    it('should fail if order is expired', () => {
      const order = OrderEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        eventId: validEventId,
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
        expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = order.markAsProcessing(PaymentMethod.KONNECT, 'ref');
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('ORDER_EXPIRED');
    });

    it('should fail from PAID status', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.markAsPaid('tx_123');

      const result = order.markAsProcessing(PaymentMethod.KONNECT, 'ref2');
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('INVALID_ORDER_STATUS');
    });
  });

  describe('markAsPaid', () => {
    it('should transition PROCESSING → PAID', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'pi_123');
      order.pullDomainEvents();

      const result = order.markAsPaid('tx_abc');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.transactionId).toBe('tx_abc');
      expect(order.paidAt).toBeInstanceOf(Date);
    });

    it('should emit OrderPaid event', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'pi_123');
      order.pullDomainEvents();

      order.markAsPaid('tx_abc');
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderPaidEvent');
    });

    it('should fail from PENDING (must go through PROCESSING)', () => {
      const order = createPendingOrder();
      const result = order.markAsPaid('tx_123');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('markAsFailed', () => {
    it('should transition PROCESSING → FAILED', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.KONNECT, 'ref');
      order.pullDomainEvents();

      const result = order.markAsFailed('Card declined');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.FAILED);
    });

    it('should emit OrderFailed event', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.KONNECT, 'ref');
      order.pullDomainEvents();

      order.markAsFailed('Insufficient funds');
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderFailedEvent');
    });

    it('should fail from PENDING status', () => {
      const order = createPendingOrder();
      const result = order.markAsFailed('reason');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should transition PENDING → CANCELLED', () => {
      const order = createPendingOrder();
      order.pullDomainEvents();

      const result = order.cancel('User changed mind');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should transition PROCESSING → CANCELLED', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.pullDomainEvents();

      const result = order.cancel('Timeout');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should fail from PAID status', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.markAsPaid('tx');

      const result = order.cancel('reason');
      expect(result.isFailure).toBe(true);
    });

    it('should emit OrderCancelled event', () => {
      const order = createPendingOrder();
      order.pullDomainEvents();

      order.cancel('No longer needed');
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderCancelledEvent');
    });
  });

  describe('expire', () => {
    it('should expire a PENDING order past its expiration', () => {
      const order = OrderEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        eventId: validEventId,
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
        expiresAt: new Date(Date.now() - 1000), // expired
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = order.expire();

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should emit OrderExpired event', () => {
      const order = OrderEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        eventId: validEventId,
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
        expiresAt: new Date(Date.now() - 1000),
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      order.expire();
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderExpiredEvent');
    });

    it('should fail if not yet expired', () => {
      const order = createPendingOrder(); // expires in 15 min
      const result = order.expire();

      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('ORDER_EXPIRED');
    });

    it('should fail if order is not PENDING', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');

      const result = order.expire();
      expect(result.isFailure).toBe(true);
    });
  });

  describe('markAsRefunded', () => {
    it('should transition PAID → REFUNDED', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.markAsPaid('tx_123');
      order.pullDomainEvents();

      const result = order.markAsRefunded('Event cancelled');

      expect(result.isSuccess).toBe(true);
      expect(order.status).toBe(OrderStatus.REFUNDED);
      expect(order.refundedAt).toBeInstanceOf(Date);
      expect(order.refundReason).toBe('Event cancelled');
    });

    it('should emit OrderRefunded event', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.markAsPaid('tx_123');
      order.pullDomainEvents();

      order.markAsRefunded('Duplicate order');
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderRefundedEvent');
    });

    it('should fail from PENDING status', () => {
      const order = createPendingOrder();
      const result = order.markAsRefunded('reason');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('query methods', () => {
    it('canBePaid returns true for PROCESSING non-expired order', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');

      expect(order.canBePaid()).toBe(true);
    });

    it('canBePaid returns false for PENDING order', () => {
      const order = createPendingOrder();
      expect(order.canBePaid()).toBe(false);
    });

    it('canBeRefunded returns true for PAID order', () => {
      const order = createPendingOrder();
      order.markAsProcessing(PaymentMethod.STRIPE, 'ref');
      order.markAsPaid('tx');

      expect(order.canBeRefunded()).toBe(true);
    });

    it('canBeRefunded returns false for PENDING order', () => {
      const order = createPendingOrder();
      expect(order.canBeRefunded()).toBe(false);
    });
  });

  describe('setPaymentFees', () => {
    it('should update total when payment fees are set', () => {
      const order = createPendingOrder();
      // subtotal=100, platformFee=4, total=104

      order.setPaymentFees(Money.create(3, 'TND'));

      expect(order.paymentFeesAmount).toBe(3);
      // total = subtotal(100) + platformFee(4) + paymentFees(3) = 107
      expect(order.totalAmount).toBe(107);
    });
  });

  describe('reconstitute', () => {
    it('should create order without validation or events', () => {
      const order = OrderEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        eventId: validEventId,
        items: [],
        status: OrderStatus.PAID,
        subtotalAmount: 200,
        platformFeeAmount: 8,
        paymentFeesAmount: 6,
        totalAmount: 214,
        currency: 'TND',
        paymentMethod: PaymentMethod.KONNECT,
        paymentGatewayOrderId: 'gw_123',
        paymentIntentId: null,
        gatewayPaymentRef: 'ref_abc',
        transactionId: 'tx_xyz',
        paidAt: new Date(),
        refundedAt: null,
        refundReason: null,
        expiresAt: new Date(),
        metadata: { holderFirstName: 'Test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(order.id).toBe('550e8400-e29b-41d4-a716-446655440099');
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.paymentMethod).toBe(PaymentMethod.KONNECT);
      expect(order.domainEvents).toHaveLength(0); // no events emitted
    });
  });
});
