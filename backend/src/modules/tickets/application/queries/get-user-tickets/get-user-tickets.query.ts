import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedTicketListDto } from '../../dtos/ticket.dto';

// ============================================
// Types for GetUserTickets operation
// ============================================

export type GetUserTicketsResultQuery = PaginatedTicketListDto;

/**
 * Query to get a user's own tickets with pagination
 */
export class GetUserTicketsQuery extends BaseQuery<GetUserTicketsResultQuery> {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly status?: string,
  ) {
    super();
    Object.freeze(this);
  }
}
