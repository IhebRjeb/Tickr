import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { RevenueReportDto } from '../../dtos/revenue-report.dto';

// ============================================
// Types
// ============================================

export type GetRevenueReportError =
  | { type: 'INVALID_FILTERS'; message: string }
  | { type: 'NO_DATA'; message: string }
  | { type: 'ACCESS_DENIED'; message: string };

export type GetRevenueReportResult = RevenueReportDto;

// ============================================
// Query
// ============================================

export class GetRevenueReportQuery extends BaseQuery<GetRevenueReportResult> {
  constructor(
    public readonly organizerId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly isAdmin: boolean = false,
  ) {
    super();
    Object.freeze(this);
  }
}
