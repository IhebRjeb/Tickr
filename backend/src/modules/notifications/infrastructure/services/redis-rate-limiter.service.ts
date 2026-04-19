import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '@shared/infrastructure/cache/cache.tokens';
import Redis from 'ioredis';


import { RateLimiterPort } from '../../application/ports/rate-limiter.port';

const REDIS_KEY_PREFIX = 'notif:rate:';

/**
 * Redis Rate Limiter
 *
 * Uses Redis sorted sets with sliding window for rate limiting.
 * Configured via notification.config.ts.
 */
@Injectable()
export class RedisRateLimiter implements RateLimiterPort {
  private readonly logger = new Logger(RedisRateLimiter.name);
  private readonly userPerHour: number;
  private readonly emailPerSecond: number;
  private readonly smsPerMinute: number;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.userPerHour =
      this.configService.get<number>(
        'notification.rateLimit.userPerHour',
      ) ?? 20;
    this.emailPerSecond =
      this.configService.get<number>(
        'notification.rateLimit.emailPerSecond',
      ) ?? 50;
    this.smsPerMinute =
      this.configService.get<number>(
        'notification.rateLimit.smsPerMinute',
      ) ?? 100;
  }

  async isAllowed(userId: string): Promise<boolean> {
    return this.checkWindow(
      `${REDIS_KEY_PREFIX}user:${userId}`,
      this.userPerHour,
      3600,
    );
  }

  async isEmailAllowed(): Promise<boolean> {
    return this.checkWindow(
      `${REDIS_KEY_PREFIX}email:global`,
      this.emailPerSecond,
      1,
    );
  }

  async isSmsAllowed(): Promise<boolean> {
    return this.checkWindow(
      `${REDIS_KEY_PREFIX}sms:global`,
      this.smsPerMinute,
      60,
    );
  }

  async record(userId: string): Promise<void> {
    await this.addToWindow(
      `${REDIS_KEY_PREFIX}user:${userId}`,
      3600,
    );
  }

  async recordEmail(): Promise<void> {
    await this.addToWindow(`${REDIS_KEY_PREFIX}email:global`, 1);
  }

  async recordSms(): Promise<void> {
    await this.addToWindow(`${REDIS_KEY_PREFIX}sms:global`, 60);
  }

  /**
   * Sliding window rate limit check using Redis sorted sets
   */
  private async checkWindow(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove expired entries and count current window
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    const results = await pipeline.exec();

    const count = (results?.[1]?.[1] as number) ?? 0;
    return count < limit;
  }

  /**
   * Record an event in the sliding window
   */
  private async addToWindow(
    key: string,
    windowSeconds: number,
  ): Promise<void> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.expire(key, windowSeconds + 1);
    await pipeline.exec();
  }
}
