import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '@shared/infrastructure/cache/cache.tokens';
import Redis from 'ioredis';

import type { CachePort } from '../../application/ports/cache.port';

const KEY_PREFIX = 'analytics:';

/**
 * Redis Cache Service
 *
 * Implements CachePort using Redis for analytics data caching.
 * Graceful degradation: logs warnings and skips cache on Redis failures.
 */
@Injectable()
export class RedisCacheService implements CachePort {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(KEY_PREFIX + key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.warn(`Cache get failed for key "${key}": ${(error as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(KEY_PREFIX + key, ttlSeconds, serialized);
      } else {
        await this.redis.set(KEY_PREFIX + key, serialized);
      }
    } catch (error) {
      this.logger.warn(`Cache set failed for key "${key}": ${(error as Error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(KEY_PREFIX + key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key "${key}": ${(error as Error).message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = KEY_PREFIX + pattern;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Cache invalidation failed for pattern "${pattern}": ${(error as Error).message}`);
    }
  }
}
