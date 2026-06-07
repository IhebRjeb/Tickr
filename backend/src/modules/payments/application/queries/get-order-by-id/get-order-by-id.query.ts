import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { OrderDto } from '../../dtos/order.dto';

// ============================================
// Types for GetOrderById operation
// ============================================

export type GetOrderByIdError =
  | { type: 'ORDER_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetOrderByIdResult = OrderDto;

// ============================================
// Query
// ============================================

/**
 * Query to get an order by ID
 *
 * Immutable query object following CQRS pattern.
 *
 * Access Rules:
 * - Order owner can view their own orders
 * - Event organizer can view orders for their events
 * - Admin can view any order
 */
export class GetOrderByIdQuery extends BaseQuery<GetOrderByIdResult> {
  constructor(
    public readonly orderId: string,
    public readonly requestingUserId: string,
    public readonly isAdmin: boolean = false,
  ) {
    super();
    Object.freeze(this);
  }
}
