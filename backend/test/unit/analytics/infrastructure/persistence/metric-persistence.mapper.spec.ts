import { MetricPersistenceMapper } from '@modules/analytics/infrastructure/persistence/mappers/metric-persistence.mapper';
import { MetricEntity } from '@modules/analytics/domain/entities/metric.entity';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { EntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';
import { MetricOrmEntity } from '@modules/analytics/infrastructure/persistence/entities/metric.orm-entity';

describe('MetricPersistenceMapper', () => {
  let mapper: MetricPersistenceMapper;

  const now = new Date('2025-06-01T12:00:00Z');
  const metricId = '550e8400-e29b-41d4-a716-446655440000';
  const entityId = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mapper = new MetricPersistenceMapper();
  });

  describe('toPersistence', () => {
    it('should map domain entity to ORM entity', () => {
      const domain = MetricEntity.reconstitute({
        id: metricId,
        metricType: MetricType.REVENUE,
        entityId,
        entityType: EntityType.EVENT,
        value: 150.5,
        unit: 'TND',
        dimensions: { orderId: 'ord-1' },
        timestamp: now,
        createdAt: now,
      });

      const orm = mapper.toPersistence(domain);

      expect(orm).toBeInstanceOf(MetricOrmEntity);
      expect(orm.id).toBe(metricId);
      expect(orm.metricType).toBe('REVENUE');
      expect(orm.entityId).toBe(entityId);
      expect(orm.entityType).toBe('EVENT');
      expect(orm.value).toBe(150.5);
      expect(orm.unit).toBe('TND');
      expect(orm.dimensions).toEqual({ orderId: 'ord-1' });
      expect(orm.timestamp).toEqual(now);
    });
  });

  describe('toDomain', () => {
    it('should map ORM entity to domain entity', () => {
      const orm = new MetricOrmEntity();
      orm.id = metricId;
      orm.metricType = 'TICKET_SOLD';
      orm.entityId = entityId;
      orm.entityType = 'ORDER';
      orm.value = 5;
      orm.unit = 'units';
      orm.dimensions = null;
      orm.timestamp = now;
      orm.createdAt = now;

      const domain = mapper.toDomain(orm);

      expect(domain).toBeInstanceOf(MetricEntity);
      expect(domain.id).toBe(metricId);
      expect(domain.metricType).toBe(MetricType.TICKET_SOLD);
      expect(domain.entityType).toBe(EntityType.ORDER);
      expect(domain.value).toBe(5);
    });

    it('should convert decimal string values to numbers', () => {
      const orm = new MetricOrmEntity();
      orm.id = metricId;
      orm.metricType = 'REVENUE';
      orm.entityId = entityId;
      orm.entityType = 'EVENT';
      orm.value = '150.500' as unknown as number; // TypeORM returns decimal as string
      orm.unit = null;
      orm.dimensions = null;
      orm.timestamp = now;
      orm.createdAt = now;

      const domain = mapper.toDomain(orm);

      expect(domain.value).toBe(150.5);
      expect(typeof domain.value).toBe('number');
    });
  });

  describe('toDomainArray', () => {
    it('should map array of ORM entities', () => {
      const orm1 = new MetricOrmEntity();
      orm1.id = metricId;
      orm1.metricType = 'REVENUE';
      orm1.entityId = entityId;
      orm1.entityType = 'EVENT';
      orm1.value = 100;
      orm1.unit = null;
      orm1.dimensions = null;
      orm1.timestamp = now;
      orm1.createdAt = now;

      const result = mapper.toDomainArray([orm1]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MetricEntity);
    });
  });
});
