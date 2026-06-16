import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { OrganizerDashboardDto } from '../../dtos/organizer-dashboard.dto';

// ============================================
// Types
// ============================================

export type GetOrganizerDashboardError =
  | { type: 'ACCESS_DENIED'; message: string };

export type GetOrganizerDashboardResult = OrganizerDashboardDto;

// ============================================
// Query
// ============================================

export class GetOrganizerDashboardQuery extends BaseQuery<GetOrganizerDashboardResult> {
  constructor(
    public readonly organizerId: string,
    public readonly timeRange: '7d' | '30d' | '90d',
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {
    super();
    Object.freeze(this);
  }
}
