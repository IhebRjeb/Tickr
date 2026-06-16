import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { generateUUID } from '@shared/domain/utils';

import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';

import type { GetRevenueReportError, GetRevenueReportResult } from './get-revenue-report.query';
import { GetRevenueReportQuery } from './get-revenue-report.query';

// ============================================
// Handler
// ============================================

@Injectable()
export class GetRevenueReportHandler {
  private readonly logger = new Logger(GetRevenueReportHandler.name);
  private static readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
  ) {}

  async execute(
    query: GetRevenueReportQuery,
  ): Promise<Result<GetRevenueReportResult, GetRevenueReportError>> {
    this.logger.debug(
      `Getting revenue report for organizer ${query.organizerId} (${query.startDate.toISOString()} - ${query.endDate.toISOString()})`,
    );

    // 1. Validate date range
    if (query.startDate >= query.endDate) {
      return Result.fail({
        type: 'INVALID_FILTERS',
        message: 'Start date must be before end date',
      });
    }

    const spanMs = query.endDate.getTime() - query.startDate.getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (spanMs > oneYearMs) {
      return Result.fail({
        type: 'INVALID_FILTERS',
        message: 'Date range cannot exceed 1 year',
      });
    }

    // 2. Check cache
    const cacheKey = `analytics:revenue-report:${query.organizerId}:${query.startDate.toISOString()}:${query.endDate.toISOString()}`;
    const cached = await this.cache.get<GetRevenueReportResult>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // 3. Fetch revenue metrics
    const revenueMetrics = await this.metricRepository.findByType(
      MetricType.REVENUE,
      query.startDate,
      query.endDate,
    );

    if (revenueMetrics.length === 0) {
      return Result.fail({
        type: 'NO_DATA',
        message: 'No revenue data available for the selected period',
      });
    }

    // 4. Calculate totals
    const totalRevenue = revenueMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalTransactions = revenueMetrics.length;

    const dto: GetRevenueReportResult = {
      reportId: generateUUID(),
      reportType: 'REVENUE_SUMMARY',
      format: 'CSV',
      url: '',
      generatedAt: new Date(),
      periodStart: query.startDate,
      periodEnd: query.endDate,
      totalRevenue,
      currency: 'TND',
      totalTransactions,
    };

    // 5. Cache
    await this.cache.set(cacheKey, dto, GetRevenueReportHandler.CACHE_TTL);

    return Result.ok(dto);
  }
}
