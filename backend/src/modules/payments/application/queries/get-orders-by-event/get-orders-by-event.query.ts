import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedOrdersDto } from '../../dtos/order.dto';

// ============================================
// Types for GetOrdersByEvent operation
// ============================================

export type GetOrdersByEventError =
  | { type: 'ACCESS_DENIED'; message: string };

export type GetOrdersByEventResult = PaginatedOrdersDto;

// ============================================
// Query
// ============================================

/**
 * Query to get orders by event ID (paginated)
 *
 * Immutable query object following CQRS pattern.
 *
 * Used for:
 * - Organizer dashboard — see all purchases for their event
 * - Admin viewing all orders for an event
 */
export class GetOrdersByEventQuery extends BaseQuery<GetOrdersByEventResult> {
  constructor(
    public readonly eventId: string,
    public readonly requestingUserId: string,
    public readonly isAdmin: boolean = false,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}
