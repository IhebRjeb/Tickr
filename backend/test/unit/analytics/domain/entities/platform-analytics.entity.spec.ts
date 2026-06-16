import { PlatformAnalyticsEntity } from '@modules/analytics/domain/entities/platform-analytics.entity';

describe('PlatformAnalyticsEntity', () => {
  const validProps = {
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
    revenueByCategory: [
      { category: 'Music', revenue: 30000, percentage: 60 },
      { category: 'Sports', revenue: 20000, percentage: 40 },
    ],
    topEvents: [
      { eventId: 'e1', title: 'Concert A', revenue: 15000, ticketsSold: 300 },
      { eventId: 'e2', title: 'Match B', revenue: 12000, ticketsSold: 250 },
    ],
    lastUpdated: new Date(),
  };

  describe('create', () => {
    it('should create platform analytics successfully', () => {
      const result = PlatformAnalyticsEntity.create(validProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe('platform-2025-01');
      expect(result.value.totalRevenue).toBe(50000);
    });

    it('should fail without id', () => {
      const result = PlatformAnalyticsEntity.create({ ...validProps, id: '' });
      expect(result.isFailure).toBe(true);
    });

    it('should fail when period start >= end', () => {
      const result = PlatformAnalyticsEntity.create({
        ...validProps,
        periodStart: new Date('2025-02-01'),
        periodEnd: new Date('2025-01-01'),
      });
      expect(result.isFailure).toBe(true);
    });

    it('should fail with negative revenue', () => {
      const result = PlatformAnalyticsEntity.create({ ...validProps, totalRevenue: -1 });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from props', () => {
      const entity = PlatformAnalyticsEntity.reconstitute(validProps);

      expect(entity.id).toBe('platform-2025-01');
      expect(entity.totalRevenue).toBe(50000);
      expect(entity.platformCommission).toBe(3000);
    });
  });

  describe('getGrowthRate', () => {
    it('should calculate growth rate between periods', () => {
      const current = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 200 });
      const previous = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 100 });

      expect(current.getGrowthRate(previous)).toBe(100);
    });

    it('should return 0 when both are 0', () => {
      const current = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 0 });
      const previous = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 0 });

      expect(current.getGrowthRate(previous)).toBe(0);
    });

    it('should calculate negative growth', () => {
      const current = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 50 });
      const previous = PlatformAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 100 });

      expect(current.getGrowthRate(previous)).toBe(-50);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top N events sorted by revenue', () => {
      const entity = PlatformAnalyticsEntity.reconstitute(validProps);
      const top = entity.getTopPerformers(1);

      expect(top).toHaveLength(1);
      expect(top[0].eventId).toBe('e1');
      expect(top[0].revenue).toBe(15000);
    });

    it('should return all events if limit exceeds count', () => {
      const entity = PlatformAnalyticsEntity.reconstitute(validProps);
      const top = entity.getTopPerformers(10);

      expect(top).toHaveLength(2);
    });
  });

  describe('getters', () => {
    it('should return immutable revenueByCategory', () => {
      const entity = PlatformAnalyticsEntity.reconstitute(validProps);
      expect(entity.revenueByCategory).toHaveLength(2);
    });

    it('should return immutable topEvents', () => {
      const entity = PlatformAnalyticsEntity.reconstitute(validProps);
      expect(entity.topEvents).toHaveLength(2);
    });
  });
});
