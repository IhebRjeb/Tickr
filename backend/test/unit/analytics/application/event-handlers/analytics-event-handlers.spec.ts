import { AnalyticsEventListener } from '@modules/analytics/application/event-handlers/analytics-event.listener';
import { RecordMetricHandler } from '@modules/analytics/application/commands/record-metric/record-metric.handler';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { EntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';
import { Result } from '@shared/domain/result';
import { Logger } from '@nestjs/common';

describe('AnalyticsEventListener', () => {
  let handlers: AnalyticsEventListener;
  let mockRecordMetricHandler: jest.Mocked<RecordMetricHandler>;

  beforeEach(() => {
    mockRecordMetricHandler = {
      execute: jest.fn().mockResolvedValue(Result.ok({ metricId: 'metric-123' })),
    } as unknown as jest.Mocked<RecordMetricHandler>;

    handlers = new AnalyticsEventListener(mockRecordMetricHandler);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('onOrderPaid', () => {
    const payload = {
      orderId: '550e8400-e29b-41d4-a716-446655440001',
      eventId: '550e8400-e29b-41d4-a716-446655440002',
      userId: '550e8400-e29b-41d4-a716-446655440003',
      totalAmount: 150,
      currency: 'TND',
      ticketCount: 3,
    };

    it('should record both REVENUE and TICKET_SOLD metrics', async () => {
      await handlers.onOrderPaid(payload);

      expect(mockRecordMetricHandler.execute).toHaveBeenCalledTimes(2);

      // First call: REVENUE
      const revenueCall = mockRecordMetricHandler.execute.mock.calls[0][0];
      expect(revenueCall.metricType).toBe(MetricType.REVENUE);
      expect(revenueCall.entityId).toBe(payload.eventId);
      expect(revenueCall.entityType).toBe(EntityType.EVENT);
      expect(revenueCall.value).toBe(150);

      // Second call: TICKET_SOLD
      const ticketCall = mockRecordMetricHandler.execute.mock.calls[1][0];
      expect(ticketCall.metricType).toBe(MetricType.TICKET_SOLD);
      expect(ticketCall.value).toBe(3);
    });

    it('should log warning when revenue recording fails', async () => {
      mockRecordMetricHandler.execute.mockResolvedValueOnce(
        Result.fail({ type: 'INVALID_METRIC', message: 'test error' }),
      );

      await handlers.onOrderPaid(payload);

      // Should still attempt second metric
      expect(mockRecordMetricHandler.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('onEventPublished', () => {
    const payload = {
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      organizerId: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Concert Test',
    };

    it('should record EVENT_CREATED metric', async () => {
      await handlers.onEventPublished(payload);

      expect(mockRecordMetricHandler.execute).toHaveBeenCalledTimes(1);
      const call = mockRecordMetricHandler.execute.mock.calls[0][0];
      expect(call.metricType).toBe(MetricType.EVENT_CREATED);
      expect(call.entityId).toBe(payload.eventId);
      expect(call.value).toBe(1);
    });
  });

  describe('onUserRegistered', () => {
    const payload = {
      userId: '550e8400-e29b-41d4-a716-446655440001',
      role: 'ATTENDEE',
    };

    it('should record USER_REGISTERED metric', async () => {
      await handlers.onUserRegistered(payload);

      expect(mockRecordMetricHandler.execute).toHaveBeenCalledTimes(1);
      const call = mockRecordMetricHandler.execute.mock.calls[0][0];
      expect(call.metricType).toBe(MetricType.USER_REGISTERED);
      expect(call.entityId).toBe(payload.userId);
      expect(call.entityType).toBe(EntityType.USER);
      expect(call.value).toBe(1);
    });
  });
});
