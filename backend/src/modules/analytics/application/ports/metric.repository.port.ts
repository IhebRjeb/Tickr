import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { MetricEntity } from '../../domain/entities/metric.entity';
import type { AggregateOptions, MetricAggregation } from '../types/metric-aggregation.types';

export type { AggregateOptions, MetricAggregation } from '../types/metric-aggregation.types';

/**
 * Injection token for MetricRepository
 */
export const METRIC_REPOSITORY = Symbol('METRIC_REPOSITORY');

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
