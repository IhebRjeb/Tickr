import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { MetricEntity } from '../../domain/entities/metric.entity';
import type { EntityType } from '../../domain/value-objects/entity-type.vo';
import type { MetricType } from '../../domain/value-objects/metric-type.vo';

/**
 * Injection token for MetricRepository
 */
export const METRIC_REPOSITORY = Symbol('METRIC_REPOSITORY');

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

/**
 * Metric Repository Port
 *
 * Defines the contract for metric persistence operations.
 * Implementation is in infrastructure layer (TypeORM).
 */
export interface MetricRepositoryPort extends IRepository<MetricEntity> {
  // ============================================
  // Query Methods
  // ============================================

  findByEntityId(
    entityId: string,
    page: number,
    limit: number,
  ): Promise<{ data: MetricEntity[]; total: number }>;

  findByType(
    metricType: MetricType,
    startDate: Date,
    endDate: Date,
  ): Promise<MetricEntity[]>;

  findByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MetricEntity[]>;

  // ============================================
  // Aggregation Methods
  // ============================================

  aggregate(options: AggregateOptions): Promise<MetricAggregation[]>;

  sumByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;

  countByEntityAndType(
    entityId: string,
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;
}
