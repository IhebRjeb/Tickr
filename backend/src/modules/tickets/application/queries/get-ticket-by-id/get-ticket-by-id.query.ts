import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { TicketDetailDto } from '../../dtos/ticket-detail.dto';

// ============================================
// Types for GetTicketById operation
// ============================================

export type GetTicketByIdErrorQuery =
  | { type: 'TICKET_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetTicketByIdResultQuery = TicketDetailDto;

/**
 * Query to get a single ticket by ID
 *
 * Access Rules:
 * - Ticket owner can view their own tickets
 * - Event organizer can view tickets for their events
 */
export class GetTicketByIdQuery extends BaseQuery<GetTicketByIdResultQuery> {
  constructor(
    public readonly ticketId: string,
    public readonly requestingUserId: string,
  ) {
    super();
    Object.freeze(this);
  }
}
