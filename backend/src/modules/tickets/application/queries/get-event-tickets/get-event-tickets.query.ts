import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PaginatedTicketListDto } from '../../dtos/ticket.dto';

// ============================================
// Types for GetEventTickets operation
// ============================================

export type GetEventTicketsErrorQuery =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetEventTicketsResultQuery = PaginatedTicketListDto;

/**
 * Query to get tickets for an event (organizer view)
 *
 * Requires organizer ownership validation.
 */
export class GetEventTicketsQuery extends BaseQuery<GetEventTicketsResultQuery> {
  constructor(
    public readonly eventId: string,
    public readonly organizerId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly status?: string,
  ) {
    super();
    Object.freeze(this);
  }
}
