import type { MetricEntity } from '../../domain/entities/metric.entity';
import type { MetricDto } from '../dtos/metric.dto';

// ============================================
// Metric Mapper (Domain ↔ DTO)
// ============================================

export class MetricMapper {
  static toDto(entity: MetricEntity): MetricDto {
    return {
      id: entity.id,
      metricType: entity.metricType,
      entityId: entity.entityId,
      entityType: entity.entityType,
      value: entity.value,
      unit: entity.unit,
      dimensions: entity.dimensions,
      timestamp: entity.timestamp,
      createdAt: entity.createdAt,
    };
  }

  static toDtoList(entities: MetricEntity[]): MetricDto[] {
    return entities.map((e) => MetricMapper.toDto(e));
  }
}
