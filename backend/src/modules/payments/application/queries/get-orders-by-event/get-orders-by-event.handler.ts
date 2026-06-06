import { Injectable, Inject, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import type { OrderEntity } from '../../../domain/entities/order.entity';
import type { OrderDto, OrderItemDto, PaginatedOrdersDto } from '../../dtos/order.dto';
import type { OrderRepositoryPort } from '../../ports/order.repository.port';
import { ORDER_REPOSITORY } from '../../ports/order.repository.port';

import {
  GetOrdersByEventQuery,
  type GetOrdersByEventResult,
  type GetOrdersByEventError,
} from './get-orders-by-event.query';

// ============================================
// Handler
// ============================================

/**
 * Handler for GetOrdersByEventQuery
 *
 * Follows CQRS pattern - read-only operation.
 *
 * Responsibilities:
 * 1. Check access permissions (organizer or admin)
 * 2. Query repository with pagination
 * 3. Map to PaginatedOrdersDto
 *
 * Note: Organizer ownership check deferred to controller layer
 * (which verifies the event belongs to the requesting user).
 */
@Injectable()
export class GetOrdersByEventHandler {
  private readonly logger = new Logger(GetOrdersByEventHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(
    query: GetOrdersByEventQuery,
  ): Promise<Result<GetOrdersByEventResult, GetOrdersByEventError>> {
    this.logger.debug(`Getting orders for event: ${query.eventId}, page: ${query.page}`);

    const { data, total } = await this.orderRepository.findByEventId(
      query.eventId,
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
