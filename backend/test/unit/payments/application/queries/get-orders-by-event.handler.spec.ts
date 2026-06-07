import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import { GetOrdersByEventHandler } from '@modules/payments/application/queries/get-orders-by-event/get-orders-by-event.handler';
import { GetOrdersByEventQuery } from '@modules/payments/application/queries/get-orders-by-event/get-orders-by-event.query';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';

describe('GetOrdersByEventHandler', () => {
  let handler: GetOrdersByEventHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;

  const validEventId = '550e8400-e29b-41d4-a716-446655440002';
  const organizerUserId = '550e8400-e29b-41d4-a716-446655440001';

  function createMockOrder(id: string, userId: string): OrderEntity {
    return OrderEntity.reconstitute({
      id,
      userId,
      eventId: validEventId,
      items: [],
      status: OrderStatus.PAID,
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
      expiresAt: new Date(),
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

    handler = new GetOrdersByEventHandler(mockOrderRepo);
  });

  describe('execute', () => {
    it('should return paginated orders for event', async () => {
      const orders = [
        createMockOrder('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440030'),
        createMockOrder('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440031'),
        createMockOrder('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440032'),
      ];
      mockOrderRepo.findByEventId.mockResolvedValue({ data: orders, total: 3 });

      const query = new GetOrdersByEventQuery(validEventId, organizerUserId, false, 1, 20);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(3);
      expect(result.value!.total).toBe(3);
      expect(result.value!.page).toBe(1);
      expect(result.value!.totalPages).toBe(1);
      expect(mockOrderRepo.findByEventId).toHaveBeenCalledWith(validEventId, 1, 20);
    });

    it('should return empty list for event with no orders', async () => {
      mockOrderRepo.findByEventId.mockResolvedValue({ data: [], total: 0 });

      const query = new GetOrdersByEventQuery(validEventId, organizerUserId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(0);
      expect(result.value!.total).toBe(0);
    });

    it('should paginate correctly', async () => {
      mockOrderRepo.findByEventId.mockResolvedValue({ data: [], total: 100 });

      const query = new GetOrdersByEventQuery(validEventId, organizerUserId, false, 3, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.page).toBe(3);
      expect(result.value!.limit).toBe(10);
      expect(result.value!.totalPages).toBe(10);
      expect(mockOrderRepo.findByEventId).toHaveBeenCalledWith(validEventId, 3, 10);
    });
  });
});
