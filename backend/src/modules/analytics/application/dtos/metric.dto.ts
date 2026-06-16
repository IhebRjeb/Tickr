import type { MetricType } from '../../domain/value-objects/metric-type.vo';
import type { EntityType } from '../../domain/value-objects/entity-type.vo';

// ============================================
// Metric DTO
// ============================================

export interface MetricDto {
  readonly id: string;
  readonly metricType: MetricType;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly value: number;
  readonly unit: string | null;
  readonly dimensions: Record<string, unknown> | null;
  readonly timestamp: Date;
  readonly createdAt: Date;
}
