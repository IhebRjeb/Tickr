import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { MetricEntity } from '../../../domain/entities/metric.entity';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';

import type { RecordMetricError, RecordMetricResult } from './record-metric.command';
import { RecordMetricCommand } from './record-metric.command';

// ============================================
// Handler
// ============================================

/**
 * RecordMetricHandler
 *
 * Creates and persists a new metric data point.
 * Publishes MetricRecordedEvent after successful creation.
 */
@Injectable()
export class RecordMetricHandler {
  private readonly logger = new Logger(RecordMetricHandler.name);

  constructor(
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: RecordMetricCommand,
  ): Promise<Result<RecordMetricResult, RecordMetricError>> {
    this.logger.debug(
      `Recording metric: ${command.metricType} for ${command.entityType}:${command.entityId}`,
    );

    // 1. Create metric entity (validates inputs)
    const metricResult = MetricEntity.create({
      metricType: command.metricType,
      entityId: command.entityId,
      entityType: command.entityType,
      value: command.value,
      unit: command.unit,
      dimensions: command.dimensions,
      timestamp: command.metricTimestamp,
    });

    if (metricResult.isFailure) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: metricResult.error.message,
      });
    }

    const metric = metricResult.value;

    // 2. Persist the metric
    try {
      await this.metricRepository.save(metric);
    } catch (error) {
      this.logger.error(`Failed to persist metric: ${(error as Error).message}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to save metric',
      });
    }

    // 3. Publish domain events
    for (const event of metric.domainEvents) {
      await this.eventPublisher.publish(event);
    }
    metric.clearDomainEvents();

    this.logger.log(
      `Metric recorded: ${metric.id} (${command.metricType}, value=${command.value})`,
    );

    return Result.ok({ metricId: metric.id });
  }
}
