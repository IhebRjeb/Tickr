import { GetSalesTimeSeriesHandler } from '@modules/analytics/application/queries/get-sales-time-series/get-sales-time-series.handler';
import { GetSalesTimeSeriesQuery } from '@modules/analytics/application/queries/get-sales-time-series/get-sales-time-series.query';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';

describe('GetSalesTimeSeriesHandler', () => {
  let handler: GetSalesTimeSeriesHandler;
  let mockMetricRepo: { findByEntityAndType: jest.Mock };
  let mockCache: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    mockMetricRepo = { findByEntityAndType: jest.fn() };
    mockCache = { get: jest.fn(), set: jest.fn() };

    handler = new GetSalesTimeSeriesHandler(
      mockMetricRepo as any,
      mockCache as any,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  it('should return time series grouped by day', async () => {
    mockCache.get.mockResolvedValue(null);
    mockMetricRepo.findByEntityAndType.mockResolvedValue([
      { metricType: MetricType.TICKET_SOLD, value: 5, timestamp: new Date('2025-03-01T10:00:00Z') },
      { metricType: MetricType.TICKET_SOLD, value: 3, timestamp: new Date('2025-03-01T14:00:00Z') },
      { metricType: MetricType.TICKET_SOLD, value: 7, timestamp: new Date('2025-03-02T09:00:00Z') },
    ]);

    const query = new GetSalesTimeSeriesQuery(
      'event-1',
      'day',
      new Date('2025-03-01'),
      new Date('2025-03-03'),
      'org-1',
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.data).toHaveLength(2);
    expect(result.value.data[0].value).toBe(8); // 5 + 3
    expect(result.value.data[1].value).toBe(7);
    expect(result.value.granularity).toBe('day');
  });

  it('should return time series grouped by hour', async () => {
    mockCache.get.mockResolvedValue(null);
    mockMetricRepo.findByEntityAndType.mockResolvedValue([
      { metricType: MetricType.TICKET_SOLD, value: 2, timestamp: new Date('2025-03-01T10:15:00Z') },
      { metricType: MetricType.TICKET_SOLD, value: 4, timestamp: new Date('2025-03-01T10:45:00Z') },
      { metricType: MetricType.TICKET_SOLD, value: 1, timestamp: new Date('2025-03-01T11:30:00Z') },
    ]);

    const query = new GetSalesTimeSeriesQuery(
      'event-1',
      'hour',
      new Date('2025-03-01T10:00:00Z'),
      new Date('2025-03-01T12:00:00Z'),
      'org-1',
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.data).toHaveLength(2);
    expect(result.value.data[0].value).toBe(6); // 2 + 4
    expect(result.value.data[1].value).toBe(1);
  });

  it('should return cached result if available', async () => {
    const cached = { eventId: 'e1', granularity: 'day', data: [] };
    mockCache.get.mockResolvedValue(cached);

    const query = new GetSalesTimeSeriesQuery(
      'event-1',
      'day',
      new Date('2025-03-01'),
      new Date('2025-03-03'),
      'org-1',
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(cached);
    expect(mockMetricRepo.findByEntityAndType).not.toHaveBeenCalled();
  });

  it('should fail when start date >= end date', async () => {
    const query = new GetSalesTimeSeriesQuery(
      'event-1',
      'day',
      new Date('2025-03-03'),
      new Date('2025-03-01'),
      'org-1',
    );

    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('INVALID_FILTERS');
  });

  it('should return empty data array when no metrics', async () => {
    mockCache.get.mockResolvedValue(null);
    mockMetricRepo.findByEntityAndType.mockResolvedValue([]);

    const query = new GetSalesTimeSeriesQuery(
      'event-1',
      'day',
      new Date('2025-03-01'),
      new Date('2025-03-03'),
      'org-1',
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.data).toHaveLength(0);
  });
});
