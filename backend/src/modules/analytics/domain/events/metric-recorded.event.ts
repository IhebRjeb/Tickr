import { DomainEvent } from '@shared/domain/domain-event.base';

import { MetricType } from '../value-objects/metric-type.vo';

/**
 * Emitted when a new metric data point is recorded.
 */
export class MetricRecordedEvent extends DomainEvent {
  constructor(
    public readonly metricId: string,
    public readonly metricType: MetricType,
    public readonly entityId: string,
    public readonly value: number,
  ) {
    super();
  }
}
