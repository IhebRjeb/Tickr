import { Injectable, Inject, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import type { OrderEntity } from '../../../domain/entities/order.entity';
import type { OrderDto, OrderItemDto } from '../../dtos/order.dto';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';

import {
  GetOrderByIdQuery,
  type GetOrderByIdResult,
  type GetOrderByIdError,
} from './get-order-by-id.query';

// ============================================
// Handler
// ============================================

/**
 * Handler for GetOrderByIdQuery
 *
 * Follows CQRS pattern - read-only operation.
 *
 * Responsibilities:
 * 1. Find order by ID
 * 2. Check access permissions
 * 3. Map to OrderDto
 */
@Injectable()
export class GetOrderByIdHandler {
  private readonly logger = new Logger(GetOrderByIdHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(
    query: GetOrderByIdQuery,
  ): Promise<Result<GetOrderByIdResult, GetOrderByIdError>> {
    this.logger.debug(`Getting order by ID: ${query.orderId}`);

    const order = await this.orderRepository.findById(query.orderId);

    if (!order) {
      return Result.fail({
        type: 'ORDER_NOT_FOUND',
        message: `Order with id '${query.orderId}' not found`,
      });
    }

    // Access control: only owner or admin can view
    if (!query.isAdmin && order.userId !== query.requestingUserId) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'You do not have permission to view this order',
      });
    }

    const orderDto = this.mapToDto(order);

    return Result.ok(orderDto);
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
