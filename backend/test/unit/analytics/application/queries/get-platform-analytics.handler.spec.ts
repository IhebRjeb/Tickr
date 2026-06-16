import { GetPlatformAnalyticsHandler } from '@modules/analytics/application/queries/get-platform-analytics/get-platform-analytics.handler';
import { GetPlatformAnalyticsQuery } from '@modules/analytics/application/queries/get-platform-analytics/get-platform-analytics.query';
import type { CachePort } from '@modules/analytics/application/ports/cache.port';
import type { PlatformAnalyticsRepositoryPort } from '@modules/analytics/application/ports/platform-analytics.repository.port';
import { PlatformAnalyticsEntity } from '@modules/analytics/domain/entities/platform-analytics.entity';
import { Logger } from '@nestjs/common';

describe('GetPlatformAnalyticsHandler', () => {
  let handler: GetPlatformAnalyticsHandler;
  let mockRepository: jest.Mocked<PlatformAnalyticsRepositoryPort>;
  let mockCache: jest.Mocked<CachePort>;

  const adminUserId = '550e8400-e29b-41d4-a716-446655440000';

  const mockEntity = PlatformAnalyticsEntity.reconstitute({
    id: 'platform-2025-01',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-01-31'),
    totalRevenue: 50000,
    currency: 'TND',
    platformCommission: 3000,
    totalEvents: 15,
    totalTicketsSold: 1000,
    activeUsers: 500,
    conversionRate: 45,
    revenueByCategory: [],
    topEvents: [],
    lastUpdated: new Date(),
  });

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByPeriod: jest.fn(),
      findLatest: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<PlatformAnalyticsRepositoryPort>;

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<CachePort>;

    handler = new GetPlatformAnalyticsHandler(mockRepository, mockCache);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('execute', () => {
    it('should deny access for non-admin users', async () => {
      const query = new GetPlatformAnalyticsQuery(adminUserId, false);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
      expect(mockRepository.findLatest).not.toHaveBeenCalled();
    });

    it('should return latest analytics for admin without date range', async () => {
      mockRepository.findLatest.mockResolvedValue(mockEntity);

      const query = new GetPlatformAnalyticsQuery(adminUserId, true);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.totalRevenue).toBe(50000);
      expect(mockRepository.findLatest).toHaveBeenCalledTimes(1);
    });

    it('should query by period when dates provided', async () => {
      mockRepository.findByPeriod.mockResolvedValue(mockEntity);

      const query = new GetPlatformAnalyticsQuery(
        adminUserId,
        true,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.findByPeriod).toHaveBeenCalledTimes(1);
    });

    it('should return NOT_FOUND when no data available', async () => {
      mockRepository.findLatest.mockResolvedValue(null);

      const query = new GetPlatformAnalyticsQuery(adminUserId, true);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
    });

    it('should return cached data when available', async () => {
      const cachedData = { id: 'platform-2025-01', totalRevenue: 50000 };
      mockCache.get.mockResolvedValue(cachedData);

      const query = new GetPlatformAnalyticsQuery(adminUserId, true);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(cachedData);
      expect(mockRepository.findLatest).not.toHaveBeenCalled();
    });
  });
});
