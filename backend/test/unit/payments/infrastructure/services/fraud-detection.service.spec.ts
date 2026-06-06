import { ConfigService } from '@nestjs/config';

import { CacheService } from '@shared/infrastructure/cache/cache.service';

import { FraudDetectionService } from '@modules/payments/infrastructure/services/fraud-detection.service';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      invalidatePattern: jest.fn(),
      generateKey: jest.fn(),
      isHealthy: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'payments.fraud.maxOrdersPerHour': 5,
          'payments.fraud.maxTicketsPerEvent': 10,
          'payments.fraud.highValueThresholdTND': 5000,
          'payments.fraud.highValueThresholdEUR': 2000,
          'payments.fraud.highValueThresholdUSD': 2000,
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    service = new FraudDetectionService(mockCacheService, mockConfigService);
  });

  describe('checkRateLimit', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    it('should allow first order (no existing key)', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.checkRateLimit(userId);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `payments:rate-limit:${userId}`,
        1,
        3600,
      );
    });

    it('should allow orders within limit', async () => {
      mockCacheService.get.mockResolvedValue(3);

      const result = await service.checkRateLimit(userId);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `payments:rate-limit:${userId}`,
        4,
        3600,
      );
    });

    it('should block orders exceeding limit', async () => {
      mockCacheService.get.mockResolvedValue(5);

      const result = await service.checkRateLimit(userId);

      expect(result).toBe(false);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should fail open on cache error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.checkRateLimit(userId);

      expect(result).toBe(true);
    });
  });

  describe('checkTicketLimit', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const eventId = '550e8400-e29b-41d4-a716-446655440002';

    it('should allow first tickets for event', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.checkTicketLimit(userId, eventId, 3);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `payments:ticket-limit:${userId}:${eventId}`,
        3,
        86400,
      );
    });

    it('should allow tickets within limit', async () => {
      mockCacheService.get.mockResolvedValue(5);

      const result = await service.checkTicketLimit(userId, eventId, 4);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `payments:ticket-limit:${userId}:${eventId}`,
        9,
        86400,
      );
    });

    it('should block tickets exceeding limit', async () => {
      mockCacheService.get.mockResolvedValue(8);

      const result = await service.checkTicketLimit(userId, eventId, 3);

      expect(result).toBe(false);
    });

    it('should block when exactly at limit', async () => {
      mockCacheService.get.mockResolvedValue(10);

      const result = await service.checkTicketLimit(userId, eventId, 1);

      expect(result).toBe(false);
    });

    it('should fail open on cache error', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.checkTicketLimit(userId, eventId, 5);

      expect(result).toBe(true);
    });
  });

  describe('isHighValueOrder', () => {
    it('should flag TND order above threshold', () => {
      expect(service.isHighValueOrder(5000, 'TND')).toBe(true);
      expect(service.isHighValueOrder(5001, 'TND')).toBe(true);
    });

    it('should not flag TND order below threshold', () => {
      expect(service.isHighValueOrder(4999, 'TND')).toBe(false);
    });

    it('should flag EUR order above threshold', () => {
      expect(service.isHighValueOrder(2000, 'EUR')).toBe(true);
    });

    it('should not flag EUR order below threshold', () => {
      expect(service.isHighValueOrder(1999, 'EUR')).toBe(false);
    });

    it('should flag unknown currency for review', () => {
      expect(service.isHighValueOrder(100, 'GBP')).toBe(true);
    });

    it('should handle case-insensitive currency', () => {
      expect(service.isHighValueOrder(5000, 'tnd')).toBe(true);
      expect(service.isHighValueOrder(4999, 'tnd')).toBe(false);
    });
  });
});
