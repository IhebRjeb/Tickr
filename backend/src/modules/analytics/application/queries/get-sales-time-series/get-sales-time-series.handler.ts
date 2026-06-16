import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';

import type {
  GetSalesTimeSeriesError,
  GetSalesTimeSeriesResult,
} from './get-sales-time-series.query';
import { GetSalesTimeSeriesQuery } from './get-sales-time-series.query';

// ============================================
// Handler
// ============================================

@Injectable()
export class GetSalesTimeSeriesHandler {
  private readonly logger = new Logger(GetSalesTimeSeriesHandler.name);
  private static readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
  ) {}

  async execute(
    query: GetSalesTimeSeriesQuery,
  ): Promise<Result<GetSalesTimeSeriesResult, GetSalesTimeSeriesError>> {
    this.logger.debug(
      `Getting sales time series for event ${query.eventId} (${query.granularity})`,
    );

    // 1. Validate date range
    if (query.startDate >= query.endDate) {
      return Result.fail({
        type: 'INVALID_FILTERS',
        message: 'Start date must be before end date',
      });
    }

    // 2. Check cache
    const cacheKey = `analytics:timeseries:${query.eventId}:${query.granularity}:${query.startDate.toISOString()}`;
    const cached = await this.cache.get<GetSalesTimeSeriesResult>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // 3. Fetch metrics
    const metrics = await this.metricRepository.findByEntityAndType(
      query.eventId,
      MetricType.TICKET_SOLD,
      query.startDate,
      query.endDate,
    );

    // 4. Group by granularity
    const grouped = new Map<string, number>();

    for (const metric of metrics) {
      const key =
        query.granularity === 'hour'
          ? metric.timestamp.toISOString().slice(0, 13)
          : metric.timestamp.toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) ?? 0) + metric.value);
    }

    const data = [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        timestamp:
          query.granularity === 'hour'
            ? new Date(key + ':00:00.000Z')
            : new Date(key),
        value,
        label: key,
      }));

    const result: GetSalesTimeSeriesResult = {
      eventId: query.eventId,
      granularity: query.granularity,
      data,
    };

    // 5. Cache
    await this.cache.set(cacheKey, result, GetSalesTimeSeriesHandler.CACHE_TTL);

    return Result.ok(result);
  }
}
