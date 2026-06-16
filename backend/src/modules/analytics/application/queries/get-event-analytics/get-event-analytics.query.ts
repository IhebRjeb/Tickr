import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventAnalyticsDto } from '../../dtos/event-analytics.dto';

// ============================================
// Types
// ============================================

export type GetEventAnalyticsError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetEventAnalyticsResult = EventAnalyticsDto;

// ============================================
// Query
// ============================================

export class GetEventAnalyticsQuery extends BaseQuery<GetEventAnalyticsResult> {
  constructor(
    public readonly eventId: string,
    public readonly requestingUserId: string,
    public readonly isAdmin: boolean = false,
  ) {
    super();
    Object.freeze(this);
  }
}
