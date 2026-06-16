import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { PlatformAnalyticsDto } from '../../dtos/platform-analytics.dto';

// ============================================
// Types
// ============================================

export type GetPlatformAnalyticsError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetPlatformAnalyticsResult = PlatformAnalyticsDto;

// ============================================
// Query
// ============================================

export class GetPlatformAnalyticsQuery extends BaseQuery<GetPlatformAnalyticsResult> {
  constructor(
    public readonly requestingUserId: string,
    public readonly isAdmin: boolean,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {
    super();
    Object.freeze(this);
  }
}
