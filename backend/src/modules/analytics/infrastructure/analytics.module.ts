import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GenerateReportHandler } from '../application/commands/generate-report/generate-report.handler';
import { RecordMetricHandler } from '../application/commands/record-metric/record-metric.handler';
import { RefreshAnalyticsHandler } from '../application/commands/refresh-analytics/refresh-analytics.handler';
import { AnalyticsEventHandlers } from '../application/event-handlers/analytics-event.handlers';
import { ANALYTICS_CACHE } from '../application/ports/cache.port';
import { EVENT_ANALYTICS_REPOSITORY } from '../application/ports/event-analytics.repository.port';
import { METRIC_REPOSITORY } from '../application/ports/metric.repository.port';
import { PLATFORM_ANALYTICS_REPOSITORY } from '../application/ports/platform-analytics.repository.port';
import { REPORT_STORAGE } from '../application/ports/report-storage.port';
import { GetEventAnalyticsHandler } from '../application/queries/get-event-analytics/get-event-analytics.handler';
import { GetOrganizerDashboardHandler } from '../application/queries/get-organizer-dashboard/get-organizer-dashboard.handler';
import { GetPlatformAnalyticsHandler } from '../application/queries/get-platform-analytics/get-platform-analytics.handler';
import { GetRevenueReportHandler } from '../application/queries/get-revenue-report/get-revenue-report.handler';
import { GetSalesTimeSeriesHandler } from '../application/queries/get-sales-time-series/get-sales-time-series.handler';

import { S3ReportStorageAdapter } from './adapters/s3-report-storage.adapter';
import { AnalyticsController } from './controllers/analytics.controller';
import { CrossModuleEventHandler } from './event-handlers/cross-module-event.handler';
import { EventAnalyticsOrmEntity } from './persistence/entities/event-analytics.orm-entity';
import { MetricOrmEntity } from './persistence/entities/metric.orm-entity';
import { PlatformAnalyticsOrmEntity } from './persistence/entities/platform-analytics.orm-entity';
import { EventAnalyticsPersistenceMapper } from './persistence/mappers/event-analytics-persistence.mapper';
import { MetricPersistenceMapper } from './persistence/mappers/metric-persistence.mapper';
import { PlatformAnalyticsPersistenceMapper } from './persistence/mappers/platform-analytics-persistence.mapper';
import { EventAnalyticsTypeOrmRepository } from './repositories/event-analytics.repository';
import { MetricTypeOrmRepository } from './repositories/metric.repository';
import { PlatformAnalyticsTypeOrmRepository } from './repositories/platform-analytics.repository';
import { AnalyticsRefreshService } from './services/analytics-refresh.service';
import { MetricAggregationService } from './services/metric-aggregation.service';
import { RedisCacheService } from './services/redis-cache.service';
import { ReportGeneratorService } from './services/report-generator.service';

// ============================================
// Command Handlers
// ============================================
const CommandHandlers = [
  RecordMetricHandler,
  RefreshAnalyticsHandler,
  GenerateReportHandler,
];

// ============================================
// Query Handlers
// ============================================
const QueryHandlers = [
  GetEventAnalyticsHandler,
  GetOrganizerDashboardHandler,
  GetPlatformAnalyticsHandler,
  GetSalesTimeSeriesHandler,
  GetRevenueReportHandler,
];

// ============================================
// Event Handlers
// ============================================
const EventHandlers = [
  AnalyticsEventHandlers,
  CrossModuleEventHandler,
];

// ============================================
// Repository Providers
// ============================================
const metricRepoProvider: Provider = {
  provide: METRIC_REPOSITORY,
  useClass: MetricTypeOrmRepository,
};

const eventAnalyticsRepoProvider: Provider = {
  provide: EVENT_ANALYTICS_REPOSITORY,
  useClass: EventAnalyticsTypeOrmRepository,
};

const platformAnalyticsRepoProvider: Provider = {
  provide: PLATFORM_ANALYTICS_REPOSITORY,
  useClass: PlatformAnalyticsTypeOrmRepository,
};

// ============================================
// Service Providers
// ============================================
const cacheProvider: Provider = {
  provide: ANALYTICS_CACHE,
  useClass: RedisCacheService,
};

const reportStorageProvider: Provider = {
  provide: REPORT_STORAGE,
  useClass: S3ReportStorageAdapter,
};

/**
 * Analytics Module
 *
 * Bounded context for analytics and reporting including:
 * - Metric recording from domain events (revenue, tickets, check-ins)
 * - Event-level analytics (materialized read models)
 * - Platform-wide analytics (admin dashboard)
 * - Time series data for charts
 * - CSV/PDF report generation with S3 storage
 * - Redis caching with cache-aside pattern
 * - Periodic refresh of materialized views (every 10 min)
 *
 * Cross-Module Integration:
 * - Listens to OrderPaidEvent, EventPublishedEvent, UserCreatedEvent
 * - Listens to TicketCheckedInEvent, OrderRefundedEvent
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetricOrmEntity,
      EventAnalyticsOrmEntity,
      PlatformAnalyticsOrmEntity,
    ]),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    // Persistence Mappers
    MetricPersistenceMapper,
    EventAnalyticsPersistenceMapper,
    PlatformAnalyticsPersistenceMapper,

    // Repositories
    metricRepoProvider,
    eventAnalyticsRepoProvider,
    platformAnalyticsRepoProvider,

    // Services
    cacheProvider,
    reportStorageProvider,
    MetricAggregationService,
    ReportGeneratorService,
    AnalyticsRefreshService,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    METRIC_REPOSITORY,
    RecordMetricHandler,
  ],
})
export class AnalyticsModule {}
