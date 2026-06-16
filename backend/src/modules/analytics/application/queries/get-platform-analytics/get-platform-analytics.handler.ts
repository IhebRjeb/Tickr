import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { PlatformAnalyticsMapper } from '../../mappers/platform-analytics.mapper';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { PLATFORM_ANALYTICS_REPOSITORY } from '../../ports/platform-analytics.repository.port';
import type { PlatformAnalyticsRepositoryPort } from '../../ports/platform-analytics.repository.port';

import type {
  GetPlatformAnalyticsError,
  GetPlatformAnalyticsResult,
} from './get-platform-analytics.query';
import { GetPlatformAnalyticsQuery } from './get-platform-analytics.query';

// ============================================
// Handler
// ============================================

@Injectable()
export class GetPlatformAnalyticsHandler {
  private readonly logger = new Logger(GetPlatformAnalyticsHandler.name);
  private static readonly CACHE_TTL = 900; // 15 minutes

  constructor(
    @Inject(PLATFORM_ANALYTICS_REPOSITORY)
    private readonly platformAnalyticsRepository: PlatformAnalyticsRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
  ) {}

  async execute(
    query: GetPlatformAnalyticsQuery,
  ): Promise<Result<GetPlatformAnalyticsResult, GetPlatformAnalyticsError>> {
    this.logger.debug('Getting platform analytics');

    // 1. Access control: admin only
    if (!query.isAdmin) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Platform analytics is only accessible by administrators',
      });
    }

    // 2. Check cache
    const cacheKey = query.startDate && query.endDate
      ? `analytics:platform:${query.startDate.toISOString()}:${query.endDate.toISOString()}`
      : 'analytics:platform:latest';

    const cached = await this.cache.get<GetPlatformAnalyticsResult>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // 3. Query repository
    let entity;
    if (query.startDate && query.endDate) {
      entity = await this.platformAnalyticsRepository.findByPeriod(
        query.startDate,
        query.endDate,
      );
    } else {
      entity = await this.platformAnalyticsRepository.findLatest();
    }

    if (!entity) {
      return Result.fail({
        type: 'NOT_FOUND',
        message: 'Platform analytics not available for the requested period',
      });
    }

    // 4. Map and cache
    const dto = PlatformAnalyticsMapper.toDto(entity);
    await this.cache.set(cacheKey, dto, GetPlatformAnalyticsHandler.CACHE_TTL);

    return Result.ok(dto);
  }
}
