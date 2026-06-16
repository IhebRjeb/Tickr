import { MetricEntity } from '../../../../src/modules/analytics/domain/entities/metric.entity';
import { MetricType } from '../../../../src/modules/analytics/domain/value-objects/metric-type.vo';
import { EntityType } from '../../../../src/modules/analytics/domain/value-objects/entity-type.vo';

describe('MetricEntity', () => {
  const validProps = {
    metricType: MetricType.REVENUE,
    entityType: EntityType.EVENT,
    entityId: '550e8400-e29b-41d4-a716-446655440000',
    value: 100,
    dimensions: { currency: 'TND' },
  };

  describe('create', () => {
    it('should create a metric entity successfully', () => {
      const result = MetricEntity.create(validProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeInstanceOf(MetricEntity);
      expect(result.value.metricType).toBe(MetricType.REVENUE);
      expect(result.value.value).toBe(100);
    });

    it('should fail with negative value', () => {
      const result = MetricEntity.create({ ...validProps, value: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_METRIC');
    });

    it('should fail with invalid entity ID', () => {
      const result = MetricEntity.create({ ...validProps, entityId: '' });

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_METRIC');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from persisted props', () => {
      const now = new Date();
      const entity = MetricEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440000',
        metricType: MetricType.TICKET_SOLD,
        entityType: EntityType.ORDER,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        value: 5,
        unit: null,
        dimensions: null,
        timestamp: now,
        createdAt: now,
      });

      expect(entity).toBeInstanceOf(MetricEntity);
      expect(entity.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(entity.metricType).toBe(MetricType.TICKET_SOLD);
    });
  });
});
