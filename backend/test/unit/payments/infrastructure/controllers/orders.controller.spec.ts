import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { Result } from '@shared/domain/result';

import { OrdersController } from '@modules/payments/infrastructure/controllers/orders.controller';
import { CreateOrderHandler } from '@modules/payments/application/commands/create-order/create-order.handler';
import { ProcessPaymentHandler } from '@modules/payments/application/commands/process-payment/process-payment.handler';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import { GetOrderByIdHandler } from '@modules/payments/application/queries/get-order-by-id/get-order-by-id.handler';
import { GetOrdersByUserHandler } from '@modules/payments/application/queries/get-orders-by-user/get-orders-by-user.handler';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockCreateOrderHandler: jest.Mocked<CreateOrderHandler>;
  let mockProcessPaymentHandler: jest.Mocked<ProcessPaymentHandler>;
  let mockRequestRefundHandler: jest.Mocked<RequestRefundHandler>;
  let mockGetOrderByIdHandler: jest.Mocked<GetOrderByIdHandler>;
  let mockGetOrdersByUserHandler: jest.Mocked<GetOrdersByUserHandler>;

  const mockUser = { userId: 'user-123', role: 'ATTENDEE' };

  beforeEach(async () => {
    mockCreateOrderHandler = { execute: jest.fn() } as any;
    mockProcessPaymentHandler = { execute: jest.fn() } as any;
    mockRequestRefundHandler = { execute: jest.fn() } as any;
    mockGetOrderByIdHandler = { execute: jest.fn() } as any;
    mockGetOrdersByUserHandler = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: CreateOrderHandler, useValue: mockCreateOrderHandler },
        { provide: ProcessPaymentHandler, useValue: mockProcessPaymentHandler },
        { provide: RequestRefundHandler, useValue: mockRequestRefundHandler },
        { provide: GetOrderByIdHandler, useValue: mockGetOrderByIdHandler },
        { provide: GetOrdersByUserHandler, useValue: mockGetOrdersByUserHandler },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('createOrder', () => {
    const dto = {
      eventId: 'event-123',
      items: [{ ticketTypeId: 'ticket-1', quantity: 2, holders: [{ name: 'A', email: 'a@b.com' }, { name: 'B', email: 'b@b.com' }] }],
      holder: { firstName: 'Ahmed', lastName: 'Ben Ali', email: 'ahmed@test.com' },
    };

    it('should create order successfully', async () => {
      const orderResult = {
        orderId: 'order-123',
        subtotal: 100,
        platformFee: 4,
        total: 104,
        currency: 'TND',
        expiresAt: new Date(),
      };
      mockCreateOrderHandler.execute.mockResolvedValue(Result.ok(orderResult));

      const result = await controller.createOrder(mockUser, dto);

      expect(result).toEqual(orderResult);
      expect(mockCreateOrderHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for EVENT_NOT_FOUND', async () => {
      mockCreateOrderHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.createOrder(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for RATE_LIMITED', async () => {
      mockCreateOrderHandler.execute.mockResolvedValue(
        Result.fail({ type: 'RATE_LIMITED', message: 'Too many orders' }),
      );

      await expect(controller.createOrder(mockUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for VALIDATION_ERROR', async () => {
      mockCreateOrderHandler.execute.mockResolvedValue(
        Result.fail({ type: 'VALIDATION_ERROR', message: 'Invalid items' }),
      );

      await expect(controller.createOrder(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMyOrders', () => {
    it('should return paginated orders', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockGetOrdersByUserHandler.execute.mockResolvedValue(Result.ok(paginatedResult));

      const result = await controller.getMyOrders(mockUser, { page: 1, limit: 20 });

      expect(result).toEqual(paginatedResult);
    });

    it('should throw ForbiddenException for ACCESS_DENIED', async () => {
      mockGetOrdersByUserHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ACCESS_DENIED', message: 'Not allowed' }),
      );

      await expect(
        controller.getMyOrders(mockUser, { page: 1, limit: 20 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOrderById', () => {
    it('should return order details', async () => {
      const orderDto = { id: 'order-123', status: 'PENDING' };
      mockGetOrderByIdHandler.execute.mockResolvedValue(Result.ok(orderDto as any));

      const result = await controller.getOrderById(mockUser, 'order-123');

      expect(result).toEqual(orderDto);
    });

    it('should throw NotFoundException for ORDER_NOT_FOUND', async () => {
      mockGetOrderByIdHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ORDER_NOT_FOUND', message: 'Not found' }),
      );

      await expect(controller.getOrderById(mockUser, 'order-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for ACCESS_DENIED', async () => {
      mockGetOrderByIdHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ACCESS_DENIED', message: 'Denied' }),
      );

      await expect(controller.getOrderById(mockUser, 'order-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('processPayment', () => {
    const dto = { paymentMethod: PaymentMethod.KONNECT };

    it('should initiate payment and return gateway response', async () => {
      const paymentResult = {
        paymentUrl: 'https://konnect.network/pay/abc',
        orderId: 'order-123',
        gatewayRef: 'kn_ref',
      };
      mockProcessPaymentHandler.execute.mockResolvedValue(Result.ok(paymentResult));

      const result = await controller.processPayment(mockUser, 'order-123', dto);

      expect(result.paymentUrl).toBe('https://konnect.network/pay/abc');
    });

    it('should throw NotFoundException for ORDER_NOT_FOUND', async () => {
      mockProcessPaymentHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ORDER_NOT_FOUND', message: 'Not found' }),
      );

      await expect(
        controller.processPayment(mockUser, 'order-123', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for GATEWAY_ERROR', async () => {
      mockProcessPaymentHandler.execute.mockResolvedValue(
        Result.fail({ type: 'GATEWAY_ERROR', message: 'Provider error' }),
      );

      await expect(
        controller.processPayment(mockUser, 'order-123', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestRefund', () => {
    const dto = { reason: 'Event cancelled' };

    it('should request refund successfully', async () => {
      const refundResult = { refundId: 'refund-123', status: 'PENDING' };
      mockRequestRefundHandler.execute.mockResolvedValue(Result.ok(refundResult));

      const result = await controller.requestRefund(mockUser, 'order-123', dto);

      expect(result).toEqual(refundResult);
    });

    it('should throw NotFoundException for ORDER_NOT_FOUND', async () => {
      mockRequestRefundHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ORDER_NOT_FOUND', message: 'Not found' }),
      );

      await expect(
        controller.requestRefund(mockUser, 'order-123', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for REFUND_NOT_ALLOWED', async () => {
      mockRequestRefundHandler.execute.mockResolvedValue(
        Result.fail({ type: 'REFUND_NOT_ALLOWED', message: 'Already refunded' }),
      );

      await expect(
        controller.requestRefund(mockUser, 'order-123', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
