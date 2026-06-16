import { Injectable } from '@nestjs/common';

import { MetricEntity, MetricProps } from '../../../domain/entities/metric.entity';
import { EntityType } from '../../../domain/value-objects/entity-type.vo';
import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { MetricOrmEntity } from '../entities/metric.orm-entity';

/**
 * Metric Persistence Mapper
 *
 * Transforms between domain MetricEntity and TypeORM MetricOrmEntity.
 */
@Injectable()
export class MetricPersistenceMapper {
  toPersistence(domain: MetricEntity): MetricOrmEntity {
    const entity = new MetricOrmEntity();
    entity.id = domain.id;
    entity.metricType = domain.metricType;
    entity.entityId = domain.entityId;
    entity.entityType = domain.entityType;
    entity.value = domain.value;
    entity.unit = domain.unit;
    entity.dimensions = domain.dimensions;
    entity.timestamp = domain.timestamp;
    entity.createdAt = domain.createdAt;
    return entity;
  }

  toDomain(raw: MetricOrmEntity): MetricEntity {
    const props: MetricProps = {
      id: raw.id,
      metricType: raw.metricType as MetricType,
      entityId: raw.entityId,
      entityType: raw.entityType as EntityType,
      value: Number(raw.value),
      unit: raw.unit,
      dimensions: raw.dimensions,
      timestamp: raw.timestamp,
      createdAt: raw.createdAt,
    };
    return MetricEntity.reconstitute(props);
  }

  toDomainArray(entities: MetricOrmEntity[]): MetricEntity[] {
    return entities.map((e) => this.toDomain(e));
  }
}
