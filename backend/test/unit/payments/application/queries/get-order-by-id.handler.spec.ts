import { GetOrderByIdQuery } from '@modules/payments/application/queries/get-order-by-id/get-order-by-id.query';
import { GetOrderByIdHandler } from '@modules/payments/application/queries/get-order-by-id/get-order-by-id.handler';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { OrderItemEntity } from '@modules/payments/domain/entities/order-item.entity';
import { Money } from '@shared/domain/value-objects/money.vo';

import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';

describe('GetOrderByIdHandler', () => {
  let handler: GetOrderByIdHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;

  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440099';

  function createMockOrder(): OrderEntity {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 15);

    const item = OrderItemEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440010',
      ticketTypeId: '550e8400-e29b-41d4-a716-446655440020',
      ticketTypeName: 'VIP Ticket',
      priceAmount: 50,
      priceCurrency: 'TND',
      quantity: 2,
      createdAt: new Date(),
    });

    return OrderEntity.reconstitute({
      id: validOrderId,
      userId: validUserId,
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [item],
      status: OrderStatus.PAID,
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
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEventId: jest.fn(),
      findExpired: jest.fn(),
      countByUserIdSince: jest.fn(),
    };

    handler = new GetOrderByIdHandler(mockOrderRepo);
  });

  describe('execute', () => {
    it('should return order for the owner', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);

      const query = new GetOrderByIdQuery(validOrderId, validUserId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.id).toBe(validOrderId);
      expect(result.value!.status).toBe(OrderStatus.PAID);
      expect(result.value!.items).toHaveLength(1);
      expect(result.value!.items[0].ticketTypeName).toBe('VIP Ticket');
      expect(result.value!.items[0].unitPrice).toBe(50);
      expect(result.value!.items[0].lineTotal).toBe(100);
      expect(result.value!.total).toBe(106);
    });

    it('should return order for admin regardless of ownership', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);

      const query = new GetOrderByIdQuery(validOrderId, otherUserId, true);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.id).toBe(validOrderId);
    });

    it('should fail if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const query = new GetOrderByIdQuery(validOrderId, validUserId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ORDER_NOT_FOUND');
    });

    it('should deny access to non-owner non-admin', async () => {
      const order = createMockOrder();
      mockOrderRepo.findById.mockResolvedValue(order);

      const query = new GetOrderByIdQuery(validOrderId, otherUserId, false);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ACCESS_DENIED');
    });
  });
});
