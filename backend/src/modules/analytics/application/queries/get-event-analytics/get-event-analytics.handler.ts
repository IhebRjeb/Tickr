import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { EVENT_ANALYTICS_REPOSITORY } from '../../ports/event-analytics.repository.port';
import type { EventAnalyticsRepositoryPort } from '../../ports/event-analytics.repository.port';
import { EventAnalyticsMapper } from '../../mappers/event-analytics.mapper';

import type { GetEventAnalyticsError, GetEventAnalyticsResult } from './get-event-analytics.query';
import { GetEventAnalyticsQuery } from './get-event-analytics.query';

// ============================================
// Handler
// ============================================

@Injectable()
export class GetEventAnalyticsHandler {
  private readonly logger = new Logger(GetEventAnalyticsHandler.name);
  private static readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @Inject(EVENT_ANALYTICS_REPOSITORY)
    private readonly eventAnalyticsRepository: EventAnalyticsRepositoryPort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
  ) {}

  async execute(
    query: GetEventAnalyticsQuery,
  ): Promise<Result<GetEventAnalyticsResult, GetEventAnalyticsError>> {
    this.logger.debug(`Getting analytics for event: ${query.eventId}`);

    // 1. Check cache
    const cacheKey = `analytics:event:${query.eventId}`;
    const cached = await this.cache.get<GetEventAnalyticsResult>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // 2. Query repository
    const entity = await this.eventAnalyticsRepository.findByEventId(query.eventId);

    if (!entity) {
      return Result.fail({
        type: 'NOT_FOUND',
        message: `Analytics not found for event ${query.eventId}`,
      });
    }

    // 3. Map to DTO and cache
    const dto = EventAnalyticsMapper.toDto(entity);
    await this.cache.set(cacheKey, dto, GetEventAnalyticsHandler.CACHE_TTL);

    return Result.ok(dto);
  }
}
