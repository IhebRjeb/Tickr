import { EventAnalyticsEntity } from '@modules/analytics/domain/entities/event-analytics.entity';
import { TimeSeriesDataVO } from '@modules/analytics/domain/value-objects/time-series-data.vo';

describe('EventAnalyticsEntity', () => {
  const validProps = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    totalRevenue: 5000,
    currency: 'TND',
    totalTicketsSold: 100,
    totalCapacity: 200,
    checkInCount: 80,
    conversionRate: 50,
    averageTicketPrice: 50,
    topSellingTicketType: 'VIP',
    salesByDay: [
      TimeSeriesDataVO.create(new Date('2025-01-01'), 30, '2025-01-01'),
      TimeSeriesDataVO.create(new Date('2025-01-02'), 70, '2025-01-02'),
    ],
    checkInsByHour: [
      TimeSeriesDataVO.create(new Date('2025-01-01T18:00:00Z'), 40, '18'),
      TimeSeriesDataVO.create(new Date('2025-01-01T19:00:00Z'), 40, '19'),
    ],
    lastUpdated: new Date(),
  };

  describe('create', () => {
    it('should create event analytics successfully', () => {
      const result = EventAnalyticsEntity.create(validProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value.eventId).toBe(validProps.eventId);
      expect(result.value.totalRevenue).toBe(5000);
      expect(result.value.totalTicketsSold).toBe(100);
    });

    it('should fail without eventId', () => {
      const result = EventAnalyticsEntity.create({ ...validProps, eventId: '' });

      expect(result.isFailure).toBe(true);
    });

    it('should fail with negative revenue', () => {
      const result = EventAnalyticsEntity.create({ ...validProps, totalRevenue: -100 });

      expect(result.isFailure).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from props', () => {
      const entity = EventAnalyticsEntity.reconstitute(validProps);

      expect(entity.eventId).toBe(validProps.eventId);
      expect(entity.totalRevenue).toBe(5000);
      expect(entity.currency).toBe('TND');
    });
  });

  describe('getConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      const entity = EventAnalyticsEntity.reconstitute(validProps);
      // 100 / 200 * 100 = 50%
      expect(entity.getConversionRate()).toBe(50);
    });

    it('should return 0 when capacity is 0', () => {
      const entity = EventAnalyticsEntity.reconstitute({
        ...validProps,
        totalCapacity: 0,
      });
      expect(entity.getConversionRate()).toBe(0);
    });
  });

  describe('getCheckInRate', () => {
    it('should calculate check-in rate correctly', () => {
      const entity = EventAnalyticsEntity.reconstitute(validProps);
      // 80 / 100 * 100 = 80%
      expect(entity.getCheckInRate()).toBe(80);
    });

    it('should return 0 when no tickets sold', () => {
      const entity = EventAnalyticsEntity.reconstitute({
        ...validProps,
        totalTicketsSold: 0,
      });
      expect(entity.getCheckInRate()).toBe(0);
    });
  });

  describe('getRevenueGrowth', () => {
    it('should calculate growth rate', () => {
      const current = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 200 });
      const previous = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 100 });

      expect(current.getRevenueGrowth(previous)).toBe(100);
    });

    it('should return 100 if previous was 0 and current > 0', () => {
      const current = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 100 });
      const previous = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 0 });

      expect(current.getRevenueGrowth(previous)).toBe(100);
    });

    it('should return 0 if both are 0', () => {
      const current = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 0 });
      const previous = EventAnalyticsEntity.reconstitute({ ...validProps, totalRevenue: 0 });

      expect(current.getRevenueGrowth(previous)).toBe(0);
    });
  });

  describe('getters', () => {
    it('should return immutable salesByDay copy', () => {
      const entity = EventAnalyticsEntity.reconstitute(validProps);
      const sales = entity.salesByDay;
      expect(sales).toHaveLength(2);
    });

    it('should return immutable checkInsByHour copy', () => {
      const entity = EventAnalyticsEntity.reconstitute(validProps);
      const checkIns = entity.checkInsByHour;
      expect(checkIns).toHaveLength(2);
    });
  });
});
