import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { EVENT_ANALYTICS_REPOSITORY } from '../../ports/event-analytics.repository.port';
import type { EventAnalyticsRepositoryPort } from '../../ports/event-analytics.repository.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';
import { EventAnalyticsMapper } from '../../mappers/event-analytics.mapper';

import type {
  GetOrganizerDashboardError,
  GetOrganizerDashboardResult,
} from './get-organizer-dashboard.query';
import { GetOrganizerDashboardQuery } from './get-organizer-dashboard.query';

// ============================================
// Handler
// ============================================

@Injectable()
export class GetOrganizerDashboardHandler {
  private readonly logger = new Logger(GetOrganizerDashboardHandler.name);
  private static readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @Inject(EVENT_ANALYTICS_REPOSITORY)
    private readonly eventAnalyticsRepository: EventAnalyticsRepositoryPort,
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
  ) {}

  async execute(
    query: GetOrganizerDashboardQuery,
  ): Promise<Result<GetOrganizerDashboardResult, GetOrganizerDashboardError>> {
    this.logger.debug(
      `Getting dashboard for organizer: ${query.organizerId} (range: ${query.timeRange})`,
    );

    // 1. Check cache
    const cacheKey = `analytics:dashboard:${query.organizerId}:${query.timeRange}:${query.page}`;
    const cached = await this.cache.get<GetOrganizerDashboardResult>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // 2. Query event analytics for this organizer
    const { data: eventAnalytics, total } =
      await this.eventAnalyticsRepository.findByOrganizerId(
        query.organizerId,
        query.page,
        query.limit,
      );

    // 3. Calculate aggregate stats
    const totalRevenue = eventAnalytics.reduce((sum, ea) => sum + ea.totalRevenue, 0);
    const totalTicketsSold = eventAnalytics.reduce((sum, ea) => sum + ea.totalTicketsSold, 0);
    const totalCheckIns = eventAnalytics.reduce((sum, ea) => sum + ea.checkInCount, 0);
    const averageCheckInRate =
      totalTicketsSold > 0
        ? Math.round((totalCheckIns / totalTicketsSold) * 10000) / 100
        : 0;

    // 4. Build revenue timeline from metrics
    const timeRangeDays = this.getTimeRangeDays(query.timeRange);
    const startDate = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const revenueMetrics = await this.metricRepository.findByType(
      MetricType.REVENUE,
      startDate,
      endDate,
    );

    const revenueTimeline = this.buildDailyTimeline(revenueMetrics);

    // 5. Build DTO
    const dto: GetOrganizerDashboardResult = {
      organizerId: query.organizerId,
      totalRevenue,
      currency: 'TND',
      totalEvents: total,
      totalTicketsSold,
      averageCheckInRate,
      revenueTimeline,
      events: EventAnalyticsMapper.toDtoList(eventAnalytics),
      page: query.page,
      limit: query.limit,
      total,
    };

    // 6. Cache result
    await this.cache.set(cacheKey, dto, GetOrganizerDashboardHandler.CACHE_TTL);

    return Result.ok(dto);
  }

  private getTimeRangeDays(range: '7d' | '30d' | '90d'): number {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
    }
  }

  private buildDailyTimeline(
    metrics: { timestamp: Date; value: number }[],
  ): { timestamp: Date; value: number; label?: string }[] {
    const grouped = new Map<string, number>();

    for (const m of metrics) {
      const dayKey = m.timestamp.toISOString().slice(0, 10);
      grouped.set(dayKey, (grouped.get(dayKey) ?? 0) + m.value);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({
        timestamp: new Date(day),
        value,
        label: day,
      }));
  }
}
