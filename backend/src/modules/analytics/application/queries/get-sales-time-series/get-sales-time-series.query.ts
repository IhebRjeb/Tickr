import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { TimeSeriesDto } from '../../dtos/time-series.dto';

// ============================================
// Types
// ============================================

export type GetSalesTimeSeriesError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'INVALID_FILTERS'; message: string };

export type GetSalesTimeSeriesResult = {
  readonly eventId: string;
  readonly granularity: 'hour' | 'day';
  readonly data: TimeSeriesDto[];
};

// ============================================
// Query
// ============================================

export class GetSalesTimeSeriesQuery extends BaseQuery<GetSalesTimeSeriesResult> {
  constructor(
    public readonly eventId: string,
    public readonly granularity: 'hour' | 'day',
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly requestingUserId: string,
  ) {
    super();
    Object.freeze(this);
  }
}
