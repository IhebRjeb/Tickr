import type { EntityType } from '../../domain/value-objects/entity-type.vo';
import type { MetricType } from '../../domain/value-objects/metric-type.vo';

/**
 * Aggregation result for metrics
 */
export interface MetricAggregation {
  metricType: MetricType;
  entityId: string;
  sum: number;
  count: number;
  avg: number;
  min: number;
  max: number;
}

/**
 * Options for metric aggregation queries
 */
export interface AggregateOptions {
  metricType?: MetricType;
  entityType?: EntityType;
  entityId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}
