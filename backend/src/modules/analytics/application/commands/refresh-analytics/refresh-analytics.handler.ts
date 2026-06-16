import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { EventAnalyticsEntity } from '../../../domain/entities/event-analytics.entity';
import { PlatformAnalyticsEntity } from '../../../domain/entities/platform-analytics.entity';
import { AnalyticsUpdatedEvent } from '../../../domain/events/analytics-updated.event';
import { EntityType } from '../../../domain/value-objects/entity-type.vo';
import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { TimeSeriesDataVO } from '../../../domain/value-objects/time-series-data.vo';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { EVENT_ANALYTICS_REPOSITORY } from '../../ports/event-analytics.repository.port';
import type { EventAnalyticsRepositoryPort } from '../../ports/event-analytics.repository.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';
import { PLATFORM_ANALYTICS_REPOSITORY } from '../../ports/platform-analytics.repository.port';
import type { PlatformAnalyticsRepositoryPort } from '../../ports/platform-analytics.repository.port';

import type { RefreshAnalyticsError, RefreshAnalyticsResult } from './refresh-analytics.command';
import { RefreshAnalyticsCommand } from './refresh-analytics.command';

// ============================================
// Handler
// ============================================

/**
 * RefreshAnalyticsHandler
 *
 * Recalculates materialized analytics views from metric data.
 * Called periodically by the cron service or on-demand.
 */
@Injectable()
export class RefreshAnalyticsHandler {
  private readonly logger = new Logger(RefreshAnalyticsHandler.name);

  constructor(
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    @Inject(EVENT_ANALYTICS_REPOSITORY)
    private readonly eventAnalyticsRepository: EventAnalyticsRepositoryPort,
    @Inject(PLATFORM_ANALYTICS_REPOSITORY)
    private readonly platformAnalyticsRepository: PlatformAnalyticsRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: RefreshAnalyticsCommand,
  ): Promise<Result<RefreshAnalyticsResult, RefreshAnalyticsError>> {
    this.logger.debug(`Refreshing analytics (target: ${command.targetType ?? 'all'})`);

    let refreshedEvents = 0;
    let platformUpdated = false;

    try {
      // Refresh event analytics
      if (!command.targetType || command.targetType === 'event') {
        refreshedEvents = await this.refreshEventAnalytics();
      }

      // Refresh platform analytics
      if (!command.targetType || command.targetType === 'platform') {
        platformUpdated = await this.refreshPlatformAnalytics();
      }

      // Invalidate cache
      await this.cache.invalidatePattern('analytics:*');

      // Publish update event
      await this.eventPublisher.publish(
        new AnalyticsUpdatedEvent(
          EntityType.PLATFORM,
          'analytics-refresh',
          new Date(),
        ),
      );

      this.logger.log(
        `Analytics refresh complete: ${refreshedEvents} events updated, platform=${platformUpdated}`,
      );

      return Result.ok({ refreshedEvents, platformUpdated });
    } catch (error) {
      this.logger.error(`Analytics refresh failed: ${(error as Error).message}`);
      return Result.fail({
        type: 'REFRESH_FAILED',
        message: `Analytics refresh failed: ${(error as Error).message}`,
      });
    }
  }

  private async refreshEventAnalytics(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get recent ticket_sold metrics to find affected event IDs
    const recentMetrics = await this.metricRepository.findByType(
      MetricType.TICKET_SOLD,
      thirtyDaysAgo,
      now,
    );

    // Deduplicate event IDs
    const eventIds = [
      ...new Set(
        recentMetrics
          .filter((m) => m.entityType === EntityType.EVENT)
          .map((m) => m.entityId),
      ),
    ];

    let updated = 0;

    for (const eventId of eventIds) {
      const analytics = await this.buildEventAnalytics(eventId, thirtyDaysAgo, now);
      if (analytics) {
        await this.eventAnalyticsRepository.save(analytics);
        updated++;
      }
    }

    return updated;
  }

  private async buildEventAnalytics(
    eventId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EventAnalyticsEntity | null> {
    // Aggregate revenue
    const totalRevenue = await this.metricRepository.sumByEntityAndType(
      eventId,
      MetricType.REVENUE,
      startDate,
      endDate,
    );

    // Aggregate ticket sales
    const totalTicketsSold = await this.metricRepository.countByEntityAndType(
      eventId,
      MetricType.TICKET_SOLD,
      startDate,
      endDate,
    );

    // Aggregate check-ins
    const checkInCount = await this.metricRepository.countByEntityAndType(
      eventId,
      MetricType.CHECK_IN,
      startDate,
      endDate,
    );

    // Build daily sales time series
    const salesMetrics = await this.metricRepository.findByEntityAndType(
      eventId,
      MetricType.TICKET_SOLD,
      startDate,
      endDate,
    );

    const salesByDay = this.groupByDay(salesMetrics.map((m) => ({ timestamp: m.timestamp, value: m.value })));

    // Build hourly check-in series
    const checkInMetrics = await this.metricRepository.findByEntityAndType(
      eventId,
      MetricType.CHECK_IN,
      startDate,
      endDate,
    );

    const checkInsByHour = this.groupByHour(checkInMetrics.map((m) => ({ timestamp: m.timestamp, value: m.value })));

    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    const result = EventAnalyticsEntity.create({
      eventId,
      totalRevenue,
      currency: 'TND',
      totalTicketsSold,
      totalCapacity: 0, // Capacity not tracked in metrics
      checkInCount,
      conversionRate: 0, // Requires capacity data
      averageTicketPrice,
      topSellingTicketType: null,
      salesByDay,
      checkInsByHour,
      lastUpdated: new Date(),
    });

    return result.isSuccess ? result.value : null;
  }

  private async refreshPlatformAnalytics(): Promise<boolean> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First of month
    const periodEnd = now;

    const totalRevenue = await this.metricRepository.sumByEntityAndType(
      'PLATFORM',
      MetricType.REVENUE,
      periodStart,
      periodEnd,
    );

    const totalTicketsSold = await this.metricRepository.countByEntityAndType(
      'PLATFORM',
      MetricType.TICKET_SOLD,
      periodStart,
      periodEnd,
    );

    const totalEvents = await this.metricRepository.countByEntityAndType(
      'PLATFORM',
      MetricType.EVENT_CREATED,
      periodStart,
      periodEnd,
    );

    const result = PlatformAnalyticsEntity.create({
      id: `platform-${periodStart.toISOString().slice(0, 7)}`,
      periodStart,
      periodEnd,
      totalRevenue,
      currency: 'TND',
      platformCommission: totalRevenue * 0.06,
      totalEvents,
      totalTicketsSold,
      activeUsers: 0,
      conversionRate: 0,
      revenueByCategory: [],
      topEvents: [],
      lastUpdated: now,
    });

    if (result.isSuccess) {
      await this.platformAnalyticsRepository.save(result.value);
      return true;
    }

    return false;
  }

  private groupByDay(
    data: { timestamp: Date; value: number }[],
  ): TimeSeriesDataVO[] {
    const grouped = new Map<string, number>();

    for (const item of data) {
      const dayKey = item.timestamp.toISOString().slice(0, 10);
      grouped.set(dayKey, (grouped.get(dayKey) ?? 0) + item.value);
    }

    return [...grouped.entries()].map(([day, value]) =>
      TimeSeriesDataVO.create(new Date(day), value, day),
    );
  }

  private groupByHour(
    data: { timestamp: Date; value: number }[],
  ): TimeSeriesDataVO[] {
    const grouped = new Map<string, number>();

    for (const item of data) {
      const hourKey = item.timestamp.toISOString().slice(0, 13);
      grouped.set(hourKey, (grouped.get(hourKey) ?? 0) + item.value);
    }

    return [...grouped.entries()].map(([hour, value]) =>
      TimeSeriesDataVO.create(new Date(hour + ':00:00.000Z'), value, hour),
    );
  }
}
