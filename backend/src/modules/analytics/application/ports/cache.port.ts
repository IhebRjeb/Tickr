/**
 * Injection token for CacheService
 */
export const ANALYTICS_CACHE = Symbol('ANALYTICS_CACHE');

/**
 * Cache Port
 *
 * Defines the contract for caching analytics data.
 * Implementation uses Redis in infrastructure layer.
 */
export interface CachePort {
  get<T>(key: string): Promise<T | null>;

  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  delete(key: string): Promise<void>;

  invalidatePattern(pattern: string): Promise<void>;
}
