import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { EntityType } from '../../../domain/value-objects/entity-type.vo';
import type { MetricType } from '../../../domain/value-objects/metric-type.vo';

// ============================================
// Types
// ============================================

export type RecordMetricError =
  | { type: 'INVALID_METRIC'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export type RecordMetricResult = {
  readonly metricId: string;
};

// ============================================
// Command
// ============================================

export class RecordMetricCommand extends BaseCommand {
  constructor(
    public readonly metricType: MetricType,
    public readonly entityId: string,
    public readonly entityType: EntityType,
    public readonly value: number,
    public readonly unit?: string,
    public readonly dimensions?: Record<string, unknown>,
    public readonly metricTimestamp?: Date,
  ) {
    super();
    Object.freeze(this);
  }
}
