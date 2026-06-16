import { GetRevenueReportHandler } from '@modules/analytics/application/queries/get-revenue-report/get-revenue-report.handler';
import { GetRevenueReportQuery } from '@modules/analytics/application/queries/get-revenue-report/get-revenue-report.query';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';

describe('GetRevenueReportHandler', () => {
  let handler: GetRevenueReportHandler;
  let mockMetricRepo: { findByType: jest.Mock };
  let mockCache: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    mockMetricRepo = { findByType: jest.fn() };
    mockCache = { get: jest.fn(), set: jest.fn() };

    handler = new GetRevenueReportHandler(
      mockMetricRepo as any,
      mockCache as any,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  it('should return revenue report for valid date range', async () => {
    mockCache.get.mockResolvedValue(null);
    mockMetricRepo.findByType.mockResolvedValue([
      { metricType: MetricType.REVENUE, entityId: 'e1', value: 100, timestamp: new Date() },
      { metricType: MetricType.REVENUE, entityId: 'e2', value: 250, timestamp: new Date() },
    ]);

    const query = new GetRevenueReportQuery(
      'org-1',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value.totalRevenue).toBe(350);
    expect(result.value.totalTransactions).toBe(2);
    expect(result.value.currency).toBe('TND');
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should return cached result if available', async () => {
    const cachedData = { reportId: 'cached', totalRevenue: 500 };
    mockCache.get.mockResolvedValue(cachedData);

    const query = new GetRevenueReportQuery(
      'org-1',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(cachedData);
    expect(mockMetricRepo.findByType).not.toHaveBeenCalled();
  });

  it('should fail when start date >= end date', async () => {
    const query = new GetRevenueReportQuery(
      'org-1',
      new Date('2025-06-01'),
      new Date('2025-01-01'),
    );

    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('INVALID_FILTERS');
  });

  it('should fail when date range exceeds 1 year', async () => {
    const query = new GetRevenueReportQuery(
      'org-1',
      new Date('2023-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('INVALID_FILTERS');
    expect(result.error.message).toContain('1 year');
  });

  it('should fail when no revenue data exists', async () => {
    mockCache.get.mockResolvedValue(null);
    mockMetricRepo.findByType.mockResolvedValue([]);

    const query = new GetRevenueReportQuery(
      'org-1',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('NO_DATA');
  });
});
