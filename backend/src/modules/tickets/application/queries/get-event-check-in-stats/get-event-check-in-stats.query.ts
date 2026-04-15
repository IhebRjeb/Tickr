import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { CheckInStatsDto } from '../../dtos/check-in-stats.dto';

// ============================================
// Types for GetEventCheckInStats operation
// ============================================

export type GetEventCheckInStatsErrorQuery =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetEventCheckInStatsResultQuery = CheckInStatsDto;

/**
 * Query to get check-in statistics for an event (organizer view)
 *
 * Returns aggregated check-in data across all ticket types.
 */
export class GetEventCheckInStatsQuery extends BaseQuery<GetEventCheckInStatsResultQuery> {
  constructor(
    public readonly eventId: string,
    public readonly organizerId: string,
  ) {
    super();
    Object.freeze(this);
  }
}
