import { MetricAggregationService } from '@modules/analytics/infrastructure/services/metric-aggregation.service';
import { MetricEntity } from '@modules/analytics/domain/entities/metric.entity';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { EntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';

describe('MetricAggregationService', () => {
  let service: MetricAggregationService;

  beforeEach(() => {
    service = new MetricAggregationService();
  });

  const createMetric = (timestamp: Date, value: number): MetricEntity => {
    return MetricEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440000',
      metricType: MetricType.REVENUE,
      entityId: '660e8400-e29b-41d4-a716-446655440000',
      entityType: EntityType.EVENT,
      value,
      unit: 'TND',
      dimensions: null,
      timestamp,
      createdAt: timestamp,
    });
  };

  describe('aggregateByDay', () => {
    it('should group metrics by day and sum values', () => {
      const metrics = [
        createMetric(new Date('2025-01-01T10:00:00Z'), 100),
        createMetric(new Date('2025-01-01T14:00:00Z'), 50),
        createMetric(new Date('2025-01-02T10:00:00Z'), 200),
      ];

      const result = service.aggregateByDay(metrics);

      expect(result.get('2025-01-01')).toBe(150);
      expect(result.get('2025-01-02')).toBe(200);
      expect(result.size).toBe(2);
    });

    it('should return empty map for no metrics', () => {
      const result = service.aggregateByDay([]);
      expect(result.size).toBe(0);
    });
  });

  describe('aggregateByHour', () => {
    it('should group metrics by hour and sum values', () => {
      const metrics = [
        createMetric(new Date('2025-01-01T10:05:00Z'), 30),
        createMetric(new Date('2025-01-01T10:45:00Z'), 20),
        createMetric(new Date('2025-01-01T11:00:00Z'), 50),
      ];

      const result = service.aggregateByHour(metrics);

      expect(result.get('2025-01-01T10')).toBe(50);
      expect(result.get('2025-01-01T11')).toBe(50);
      expect(result.size).toBe(2);
    });
  });

  describe('calculateMovingAverage', () => {
    it('should calculate moving average with given window', () => {
      const data = [10, 20, 30, 40, 50];
      const result = service.calculateMovingAverage(data, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(20); // (10+20+30)/3
      expect(result[1]).toBe(30); // (20+30+40)/3
      expect(result[2]).toBe(40); // (30+40+50)/3
    });

    it('should return original data when window exceeds length', () => {
      const data = [10, 20];
      const result = service.calculateMovingAverage(data, 5);

      expect(result).toEqual([10, 20]);
    });

    it('should handle empty array', () => {
      const result = service.calculateMovingAverage([], 3);
      expect(result).toEqual([]);
    });
  });

  describe('calculateGrowthRate', () => {
    it('should calculate positive growth', () => {
      expect(service.calculateGrowthRate(200, 100)).toBe(100);
    });

    it('should calculate negative growth', () => {
      expect(service.calculateGrowthRate(50, 100)).toBe(-50);
    });

    it('should return 100 when previous is 0 and current > 0', () => {
      expect(service.calculateGrowthRate(50, 0)).toBe(100);
    });

    it('should return 0 when both are 0', () => {
      expect(service.calculateGrowthRate(0, 0)).toBe(0);
    });

    it('should handle decimal precision', () => {
      const result = service.calculateGrowthRate(150, 100);
      expect(result).toBe(50);
    });
  });
});
