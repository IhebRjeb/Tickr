import { Injectable, Logger } from '@nestjs/common';

import type { MetricEntity } from '../../domain/entities/metric.entity';

/**
 * Metric Aggregation Service
 *
 * Provides time-based aggregation and statistical calculations.
 */
@Injectable()
export class MetricAggregationService {
  private readonly logger = new Logger(MetricAggregationService.name);

  aggregateByHour(
    metrics: MetricEntity[],
  ): Map<string, number> {
    const grouped = new Map<string, number>();

    for (const metric of metrics) {
      const hourKey = metric.timestamp.toISOString().slice(0, 13);
      grouped.set(hourKey, (grouped.get(hourKey) ?? 0) + metric.value);
    }

    return grouped;
  }

  aggregateByDay(
    metrics: MetricEntity[],
  ): Map<string, number> {
    const grouped = new Map<string, number>();

    for (const metric of metrics) {
      const dayKey = metric.timestamp.toISOString().slice(0, 10);
      grouped.set(dayKey, (grouped.get(dayKey) ?? 0) + metric.value);
    }

    return grouped;
  }

  calculateMovingAverage(data: number[], windowSize: number): number[] {
    if (data.length < windowSize) return data;

    const result: number[] = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(Math.round(avg * 100) / 100);
    }

    return result;
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }
}
