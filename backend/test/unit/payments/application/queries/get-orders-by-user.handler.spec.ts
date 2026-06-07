import type { OrderRepositoryPort } from '@modules/payments/application/ports/order.repository.port';
import { GetOrdersByUserHandler } from '@modules/payments/application/queries/get-orders-by-user/get-orders-by-user.handler';
import { GetOrdersByUserQuery } from '@modules/payments/application/queries/get-orders-by-user/get-orders-by-user.query';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';

describe('GetOrdersByUserHandler', () => {
  let handler: GetOrdersByUserHandler;
  let mockOrderRepo: jest.Mocked<OrderRepositoryPort>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440001';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440099';

  function createMockOrder(id: string): OrderEntity {
    return OrderEntity.reconstitute({
      id,
      userId: validUserId,
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      items: [],
      status: OrderStatus.PAID,
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

    handler = new GetOrdersByUserHandler(mockOrderRepo);
  });

  describe('execute', () => {
    it('should return paginated orders for user', async () => {
      const orders = [
        createMockOrder('550e8400-e29b-41d4-a716-446655440010'),
        createMockOrder('550e8400-e29b-41d4-a716-446655440011'),
      ];
      mockOrderRepo.findByUserId.mockResolvedValue({ data: orders, total: 2 });

      const query = new GetOrdersByUserQuery(validUserId, validUserId, false, 1, 20);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(2);
      expect(result.value!.total).toBe(2);
      expect(result.value!.page).toBe(1);
      expect(result.value!.limit).toBe(20);
      expect(result.value!.totalPages).toBe(1);
      expect(mockOrderRepo.findByUserId).toHaveBeenCalledWith(validUserId, 1, 20);
    });

    it('should allow admin to view any users orders', async () => {
      mockOrderRepo.findByUserId.mockResolvedValue({ data: [], total: 0 });

      const query = new GetOrdersByUserQuery(validUserId, otherUserId, true, 1, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(mockOrderRepo.findByUserId).toHaveBeenCalledWith(validUserId, 1, 10);
    });

    it('should deny access to non-owner non-admin', async () => {
      const query = new GetOrdersByUserQuery(validUserId, otherUserId, false, 1, 20);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error!.type).toBe('ACCESS_DENIED');
    });

    it('should return empty list when no orders', async () => {
      mockOrderRepo.findByUserId.mockResolvedValue({ data: [], total: 0 });

      const query = new GetOrdersByUserQuery(validUserId, validUserId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.data).toHaveLength(0);
      expect(result.value!.total).toBe(0);
      expect(result.value!.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      mockOrderRepo.findByUserId.mockResolvedValue({ data: [], total: 45 });

      const query = new GetOrdersByUserQuery(validUserId, validUserId, false, 1, 20);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.totalPages).toBe(3);
    });
  });
});
