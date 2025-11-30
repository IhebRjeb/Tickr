import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache Service
 * 
 * Provides Redis-based caching with retry logic
 * Key naming convention: {module}:{entity}:{id}
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client!: Redis;
  private readonly defaultTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('REDIS_TTL', 300);
  }

  async onModuleInit(): Promise<void> {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error', error);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  /**
   * Generate cache key with naming convention
   */
  generateKey(module: string, entity: string, id: string): string {
    return `${module}:${entity}:${id}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttl ?? this.defaultTTL);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error for ${pattern}`, error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
