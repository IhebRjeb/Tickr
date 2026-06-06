import { Injectable, Inject, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import type { OrderEntity } from '../../../domain/entities/order.entity';
import type { OrderDto, OrderItemDto, PaginatedOrdersDto } from '../../dtos/order.dto';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';

import {
  GetOrdersByUserQuery,
  type GetOrdersByUserResult,
  type GetOrdersByUserError,
} from './get-orders-by-user.query';

// ============================================
// Handler
// ============================================

/**
 * Handler for GetOrdersByUserQuery
 *
 * Follows CQRS pattern - read-only operation.
 *
 * Responsibilities:
 * 1. Check access permissions
 * 2. Query repository with pagination
 * 3. Map to PaginatedOrdersDto
 */
@Injectable()
export class GetOrdersByUserHandler {
  private readonly logger = new Logger(GetOrdersByUserHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(
    query: GetOrdersByUserQuery,
  ): Promise<Result<GetOrdersByUserResult, GetOrdersByUserError>> {
    this.logger.debug(`Getting orders for user: ${query.userId}, page: ${query.page}`);

    // Access control: only own orders or admin
    if (!query.isAdmin && query.userId !== query.requestingUserId) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'You do not have permission to view these orders',
      });
    }

    const { data, total } = await this.orderRepository.findByUserId(
      query.userId,
      query.page,
      query.limit,
    );

    const orderDtos = data.map((order) => this.mapToDto(order));
    const totalPages = Math.ceil(total / query.limit);

    const result: PaginatedOrdersDto = {
      data: orderDtos,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };

    return Result.ok(result);
  }

  private mapToDto(order: OrderEntity): OrderDto {
    const items: OrderItemDto[] = order.items.map((item) => ({
      id: item.id,
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.ticketTypeName,
      quantity: item.quantity,
      unitPrice: item.priceAmount,
      lineTotal: item.lineTotal.amount,
    }));

    return {
      id: order.id,
      userId: order.userId,
      eventId: order.eventId,
      status: order.status,
      items,
      subtotal: order.subtotalAmount,
      platformFee: order.platformFeeAmount,
      paymentFees: order.paymentFeesAmount,
      total: order.totalAmount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      paidAt: order.paidAt,
      refundedAt: order.refundedAt,
      refundReason: order.refundReason,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
