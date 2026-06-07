import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedOrdersDto } from '../../dtos/order.dto';

// ============================================
// Types for GetOrdersByUser operation
// ============================================

export type GetOrdersByUserError =
  | { type: 'ACCESS_DENIED'; message: string };

export type GetOrdersByUserResult = PaginatedOrdersDto;

// ============================================
// Query
// ============================================

/**
 * Query to get orders by user ID (paginated)
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - User's order history page
 * - Admin viewing a specific user's orders
 */
export class GetOrdersByUserQuery extends BaseQuery<GetOrdersByUserResult> {
  constructor(
    public readonly userId: string,
    public readonly requestingUserId: string,
    public readonly isAdmin: boolean = false,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}
