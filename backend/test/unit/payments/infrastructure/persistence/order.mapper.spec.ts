import { OrderItemEntity } from '@modules/payments/domain/entities/order-item.entity';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { OrderItemOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order-item.orm-entity';
import { OrderOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { OrderMapper } from '@modules/payments/infrastructure/persistence/mappers/order.mapper';

describe('OrderMapper', () => {
  let mapper: OrderMapper;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';
  const validEventId = '550e8400-e29b-41d4-a716-446655440002';
  const validItemId = '550e8400-e29b-41d4-a716-446655440010';

  beforeEach(() => {
    mapper = new OrderMapper();
  });

  function createDomainOrder(): OrderEntity {
    const item = OrderItemEntity.reconstitute({
      id: validItemId,
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440020',
      ticketTypeName: 'VIP',
      priceAmount: 50,
      priceCurrency: 'TND',
      quantity: 2,
      createdAt: new Date('2026-01-01'),
    });

    return OrderEntity.reconstitute({
      id: validOrderId,
      userId: validUserId,
      eventId: validEventId,
      items: [item],
      status: OrderStatus.PAID,
      subtotalAmount: 100,
      platformFeeAmount: 4,
      paymentFeesAmount: 2,
      totalAmount: 106,
      currency: 'TND',
      paymentMethod: PaymentMethod.STRIPE,
      paymentGatewayOrderId: 'gw_123',
      paymentIntentId: 'pi_123',
      gatewayPaymentRef: 'ref_123',
      transactionId: 'txn_456',
      paidAt: new Date('2026-01-01T12:00:00Z'),
      refundedAt: null,
      refundReason: null,
      expiresAt: new Date('2026-01-01T12:15:00Z'),
      metadata: { holderEmail: 'test@example.com' },
      createdAt: new Date('2026-01-01T11:45:00Z'),
      updatedAt: new Date('2026-01-01T12:00:00Z'),
    });
  }

  function createOrmOrder(): OrderOrmEntity {
    const item = new OrderItemOrmEntity();
    item.id = validItemId;
    item.orderId = validOrderId;
    item.ticketTypeId = '550e8400-e29b-41d4-a716-446655440020';
    item.ticketTypeName = 'VIP';
    item.priceAmount = 50;
    item.priceCurrency = 'TND';
    item.quantity = 2;
    item.createdAt = new Date('2026-01-01');

    const entity = new OrderOrmEntity();
    entity.id = validOrderId;
    entity.userId = validUserId;
    entity.eventId = validEventId;
    entity.items = [item];
    entity.status = OrderStatus.PAID;
    entity.subtotalAmount = 100;
    entity.platformFeeAmount = 4;
    entity.paymentFeesAmount = 2;
    entity.totalAmount = 106;
    entity.currency = 'TND';
    entity.paymentMethod = PaymentMethod.STRIPE;
    entity.paymentGatewayOrderId = 'gw_123';
    entity.paymentIntentId = 'pi_123';
    entity.gatewayPaymentRef = 'ref_123';
    entity.transactionId = 'txn_456';
    entity.paidAt = new Date('2026-01-01T12:00:00Z');
    entity.refundedAt = null;
    entity.refundReason = null;
    entity.expiresAt = new Date('2026-01-01T12:15:00Z');
    entity.metadata = { holderEmail: 'test@example.com' };
    entity.createdAt = new Date('2026-01-01T11:45:00Z');
    entity.updatedAt = new Date('2026-01-01T12:00:00Z');

    return entity;
  }

  describe('toPersistence', () => {
    it('should convert domain order to ORM entity', () => {
      const domain = createDomainOrder();
      const orm = mapper.toPersistence(domain);

      expect(orm.id).toBe(validOrderId);
      expect(orm.userId).toBe(validUserId);
      expect(orm.eventId).toBe(validEventId);
      expect(orm.status).toBe(OrderStatus.PAID);
      expect(orm.paymentMethod).toBe(PaymentMethod.STRIPE);
      expect(orm.subtotalAmount).toBe(100);
      expect(orm.platformFeeAmount).toBe(4);
      expect(orm.totalAmount).toBe(106);
      expect(orm.currency).toBe('TND');
      expect(orm.transactionId).toBe('txn_456');
      expect(orm.metadata).toEqual({ holderEmail: 'test@example.com' });
    });

    it('should map items correctly', () => {
      const domain = createDomainOrder();
      const orm = mapper.toPersistence(domain);

      expect(orm.items).toHaveLength(1);
      expect(orm.items[0].id).toBe(validItemId);
      expect(orm.items[0].orderId).toBe(validOrderId);
      expect(orm.items[0].ticketTypeName).toBe('VIP');
      expect(orm.items[0].priceAmount).toBe(50);
      expect(orm.items[0].quantity).toBe(2);
    });
  });

  describe('toDomain', () => {
    it('should convert ORM entity to domain order', () => {
      const orm = createOrmOrder();
      const domain = mapper.toDomain(orm);

      expect(domain.id).toBe(validOrderId);
      expect(domain.userId).toBe(validUserId);
      expect(domain.eventId).toBe(validEventId);
      expect(domain.status).toBe(OrderStatus.PAID);
      expect(domain.paymentMethod).toBe(PaymentMethod.STRIPE);
      expect(domain.subtotalAmount).toBe(100);
      expect(domain.platformFeeAmount).toBe(4);
      expect(domain.totalAmount).toBe(106);
      expect(domain.transactionId).toBe('txn_456');
    });

    it('should convert decimal strings to numbers', () => {
      const orm = createOrmOrder();
      // TypeORM returns decimals as strings from PostgreSQL
      (orm as any).subtotalAmount = '100.000';
      (orm as any).platformFeeAmount = '4.000';
      (orm as any).totalAmount = '106.000';

      const domain = mapper.toDomain(orm);

      expect(domain.subtotalAmount).toBe(100);
      expect(domain.platformFeeAmount).toBe(4);
      expect(domain.totalAmount).toBe(106);
    });

    it('should handle null items array', () => {
      const orm = createOrmOrder();
      (orm as any).items = null;

      const domain = mapper.toDomain(orm);

      expect(domain.items).toHaveLength(0);
    });

    it('should map items to domain entities', () => {
      const orm = createOrmOrder();
      const domain = mapper.toDomain(orm);

      const items = domain.items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(validItemId);
      expect(items[0].ticketTypeName).toBe('VIP');
      expect(items[0].priceAmount).toBe(50);
      expect(items[0].quantity).toBe(2);
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of ORM entities', () => {
      const orms = [createOrmOrder(), createOrmOrder()];
      const domains = mapper.toDomainArray(orms);

      expect(domains).toHaveLength(2);
      expect(domains[0].id).toBe(validOrderId);
    });
  });

  describe('updatePersistence', () => {
    it('should update ORM entity from domain without changing id/userId', () => {
      const target = createOrmOrder();

      // Modify source (simulate domain changes)
      const modifiedSource = OrderEntity.reconstitute({
        ...{
          id: validOrderId,
          userId: validUserId,
          eventId: validEventId,
          items: [],
          status: OrderStatus.REFUNDED,
          subtotalAmount: 100,
          platformFeeAmount: 4,
          paymentFeesAmount: 2,
          totalAmount: 106,
          currency: 'TND',
          paymentMethod: PaymentMethod.STRIPE,
          paymentGatewayOrderId: 'gw_123',
          paymentIntentId: 'pi_123',
          gatewayPaymentRef: 'ref_123',
          transactionId: 'txn_456',
          paidAt: new Date('2026-01-01T12:00:00Z'),
          refundedAt: new Date('2026-01-02T10:00:00Z'),
          refundReason: 'Event cancelled',
          expiresAt: new Date('2026-01-01T12:15:00Z'),
          metadata: null,
          createdAt: new Date('2026-01-01T11:45:00Z'),
          updatedAt: new Date('2026-01-02T10:00:00Z'),
        },
      });

      const updated = mapper.updatePersistence(target, modifiedSource);

      expect(updated).toBe(target); // Same instance
      expect(updated.status).toBe(OrderStatus.REFUNDED);
      expect(updated.refundedAt).toEqual(new Date('2026-01-02T10:00:00Z'));
      expect(updated.refundReason).toBe('Event cancelled');
    });
  });
});
