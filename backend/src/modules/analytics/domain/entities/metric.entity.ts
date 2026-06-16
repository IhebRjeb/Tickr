import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { MetricRecordedEvent } from '../events/metric-recorded.event';
import { InvalidMetricException } from '../exceptions/invalid-metric.exception';
import { EntityType, isValidEntityType } from '../value-objects/entity-type.vo';
import { MetricType, isValidMetricType } from '../value-objects/metric-type.vo';

// ============================================
// Types
// ============================================

export type CreateMetricProps = {
  metricType: MetricType;
  entityId: string;
  entityType: EntityType;
  value: number;
  unit?: string;
  dimensions?: Record<string, unknown>;
  timestamp?: Date;
};

export type MetricProps = {
  id: string;
  metricType: MetricType;
  entityId: string;
  entityType: EntityType;
  value: number;
  unit: string | null;
  dimensions: Record<string, unknown> | null;
  timestamp: Date;
  createdAt: Date;
};

type MetricError = { type: string; message: string };

// ============================================
// Metric Entity (Aggregate Root)
// ============================================

/**
 * Metric Entity
 *
 * An immutable data point recorded from domain events.
 * Once created, a metric cannot be modified (append-only audit trail).
 */
export class MetricEntity extends BaseEntity<MetricProps> {
  private readonly _metricType: MetricType;
  private readonly _entityId: string;
  private readonly _entityType: EntityType;
  private readonly _value: number;
  private readonly _unit: string | null;
  private readonly _dimensions: Record<string, unknown> | null;
  private readonly _timestamp: Date;

  private constructor(props: MetricProps) {
    super(props.id, props.createdAt);
    this._metricType = props.metricType;
    this._entityId = props.entityId;
    this._entityType = props.entityType;
    this._value = props.value;
    this._unit = props.unit;
    this._dimensions = props.dimensions;
    this._timestamp = props.timestamp;
  }

  // ============================================
  // Factory Methods
  // ============================================

  static create(props: CreateMetricProps): Result<MetricEntity, MetricError> {
    // Validate metric type
    if (!isValidMetricType(props.metricType)) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: `Invalid metric type: ${props.metricType}`,
      });
    }

    // Validate entity type
    if (!isValidEntityType(props.entityType)) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: `Invalid entity type: ${props.entityType}`,
      });
    }

    // Validate entityId
    if (!props.entityId || !isUUID(props.entityId)) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Entity ID must be a valid UUID',
      });
    }

    // Validate value
    if (typeof props.value !== 'number' || isNaN(props.value) || props.value < 0) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Metric value must be a non-negative number',
      });
    }

    const now = new Date();
    const metricProps: MetricProps = {
      id: generateUUID(),
      metricType: props.metricType,
      entityId: props.entityId,
      entityType: props.entityType,
      value: props.value,
      unit: props.unit ?? null,
      dimensions: props.dimensions ?? null,
      timestamp: props.timestamp ?? now,
      createdAt: now,
    };

    const metric = new MetricEntity(metricProps);

    metric.addDomainEvent(
      new MetricRecordedEvent(
        metric.id,
        metric.metricType,
        metric.entityId,
        metric.value,
      ),
    );

    return Result.ok(metric);
  }

  static reconstitute(props: MetricProps): MetricEntity {
    if (!props.id) {
      throw new InvalidMetricException('Cannot reconstitute metric without ID');
    }
    return new MetricEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get metricType(): MetricType {
    return this._metricType;
  }

  get entityId(): string {
    return this._entityId;
  }

  get entityType(): EntityType {
    return this._entityType;
  }

  get value(): number {
    return this._value;
  }

  get unit(): string | null {
    return this._unit;
  }

  get dimensions(): Record<string, unknown> | null {
    return this._dimensions ? { ...this._dimensions } : null;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  // ============================================
  // BaseEntity Implementation
  // ============================================

  clone(): MetricProps {
    return {
      id: this._id,
      metricType: this._metricType,
      entityId: this._entityId,
      entityType: this._entityType,
      value: this._value,
      unit: this._unit,
      dimensions: this._dimensions ? { ...this._dimensions } : null,
      timestamp: this._timestamp,
      createdAt: this._createdAt,
    };
  }

  validate(): void {
    if (!isValidMetricType(this._metricType)) {
      throw new InvalidMetricException(`Invalid metric type: ${this._metricType}`);
    }
    if (!isValidEntityType(this._entityType)) {
      throw new InvalidMetricException(`Invalid entity type: ${this._entityType}`);
    }
    if (this._value < 0) {
      throw new InvalidMetricException('Metric value must be non-negative');
    }
  }
}
