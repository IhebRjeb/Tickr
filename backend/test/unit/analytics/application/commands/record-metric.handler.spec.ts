import { RecordMetricCommand } from '@modules/analytics/application/commands/record-metric/record-metric.command';
import { RecordMetricHandler } from '@modules/analytics/application/commands/record-metric/record-metric.handler';
import type { MetricRepositoryPort } from '@modules/analytics/application/ports/metric.repository.port';
import { EntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('RecordMetricHandler', () => {
  let handler: RecordMetricHandler;
  let mockMetricRepository: jest.Mocked<MetricRepositoryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validEntityId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockMetricRepository = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findById: jest.fn(),
      findByEntityId: jest.fn(),
      findByType: jest.fn(),
      findByEntityAndType: jest.fn(),
      aggregate: jest.fn(),
      sumByEntityAndType: jest.fn(),
      countByEntityAndType: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<MetricRepositoryPort>;

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishAll: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DomainEventPublisher>;

    handler = new RecordMetricHandler(mockMetricRepository, mockEventPublisher);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('execute', () => {
    it('should record a metric successfully', async () => {
      const command = new RecordMetricCommand(
        MetricType.REVENUE,
        validEntityId,
        EntityType.EVENT,
        150.5,
        'TND',
        { orderId: 'order-123' },
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.metricId).toBeDefined();
      expect(mockMetricRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('should fail with invalid metric type', async () => {
      const command = new RecordMetricCommand(
        'INVALID' as MetricType,
        validEntityId,
        EntityType.EVENT,
        100,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_METRIC');
      expect(mockMetricRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with negative value', async () => {
      const command = new RecordMetricCommand(
        MetricType.REVENUE,
        validEntityId,
        EntityType.EVENT,
        -10,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_METRIC');
    });

    it('should fail with invalid entity ID', async () => {
      const command = new RecordMetricCommand(
        MetricType.REVENUE,
        'not-a-uuid',
        EntityType.EVENT,
        100,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_METRIC');
    });

    it('should return persistence error when save fails', async () => {
      mockMetricRepository.save.mockRejectedValue(new Error('DB connection lost'));

      const command = new RecordMetricCommand(
        MetricType.REVENUE,
        validEntityId,
        EntityType.EVENT,
        100,
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });

    it('should use custom timestamp when provided', async () => {
      const customTimestamp = new Date('2025-01-15T10:00:00Z');
      const command = new RecordMetricCommand(
        MetricType.TICKET_SOLD,
        validEntityId,
        EntityType.EVENT,
        5,
        'units',
        undefined,
        customTimestamp,
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedMetric = mockMetricRepository.save.mock.calls[0][0];
      expect(savedMetric.timestamp).toEqual(customTimestamp);
    });
  });
});
