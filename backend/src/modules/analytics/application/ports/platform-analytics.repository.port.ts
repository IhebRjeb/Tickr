import type { PlatformAnalyticsEntity } from '../../domain/entities/platform-analytics.entity';

/**
 * Injection token for PlatformAnalyticsRepository
 */
export const PLATFORM_ANALYTICS_REPOSITORY = Symbol(
  'PLATFORM_ANALYTICS_REPOSITORY',
);

/**
 * Platform Analytics Repository Port
 *
 * Defines the contract for platform-wide analytics persistence.
 * This is a read-model repository (materialized views).
 */
export interface PlatformAnalyticsRepositoryPort {
  save(entity: PlatformAnalyticsEntity): Promise<PlatformAnalyticsEntity>;

  findByPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<PlatformAnalyticsEntity | null>;

  findLatest(): Promise<PlatformAnalyticsEntity | null>;

  findAll(
    page: number,
    limit: number,
  ): Promise<{ data: PlatformAnalyticsEntity[]; total: number }>;
}
