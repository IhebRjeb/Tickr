import { GenerateReportCommand } from '@modules/analytics/application/commands/generate-report/generate-report.command';
import { GenerateReportHandler } from '@modules/analytics/application/commands/generate-report/generate-report.handler';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';

describe('GenerateReportHandler', () => {
  let handler: GenerateReportHandler;
  let mockMetricRepo: { findByType: jest.Mock };
  let mockReportStorage: { upload: jest.Mock; getSignedUrl: jest.Mock };
  let mockCache: { get: jest.Mock; set: jest.Mock };
  let mockEventPublisher: { publish: jest.Mock };

  beforeEach(() => {
    mockMetricRepo = { findByType: jest.fn() };
    mockReportStorage = {
      upload: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/report.csv'),
    };
    mockCache = { get: jest.fn(), set: jest.fn() };
    mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    handler = new GenerateReportHandler(
      mockMetricRepo as any,
      mockReportStorage as any,
      mockCache as any,
      mockEventPublisher as any,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should generate CSV report successfully', async () => {
    mockMetricRepo.findByType.mockResolvedValue([
      { metricType: MetricType.REVENUE, entityId: 'e1', value: 100, timestamp: new Date('2025-03-01') },
      { metricType: MetricType.REVENUE, entityId: 'e2', value: 200, timestamp: new Date('2025-03-02') },
    ]);

    const command = new GenerateReportCommand(
      'EVENT_REVENUE',
      'org-1',
      'CSV',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(result.value.format).toBe('CSV');
    expect(result.value.url).toBe('https://s3.example.com/report.csv');
    expect(result.value.reportId).toBeDefined();
    expect(mockReportStorage.upload).toHaveBeenCalled();
    expect(mockEventPublisher.publish).toHaveBeenCalled();
  });

  it('should generate PDF report successfully', async () => {
    mockMetricRepo.findByType.mockResolvedValue([
      { metricType: MetricType.REVENUE, entityId: 'e1', value: 150, timestamp: new Date() },
    ]);

    const command = new GenerateReportCommand(
      'PLATFORM_SUMMARY',
      'org-1',
      'PDF',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(result.value.format).toBe('PDF');
  });

  it('should fail when start date >= end date', async () => {
    const command = new GenerateReportCommand(
      'EVENT_REVENUE',
      'org-1',
      'CSV',
      new Date('2025-06-01'),
      new Date('2025-01-01'),
    );

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('INVALID_FILTERS');
  });

  it('should fail when time range exceeds 1 year', async () => {
    const command = new GenerateReportCommand(
      'EVENT_REVENUE',
      'org-1',
      'CSV',
      new Date('2023-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('INVALID_FILTERS');
    expect(result.error.message).toContain('1 year');
  });

  it('should fail when no data is available', async () => {
    mockMetricRepo.findByType.mockResolvedValue([]);

    const command = new GenerateReportCommand(
      'EVENT_REVENUE',
      'org-1',
      'CSV',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('NO_DATA');
  });

  it('should fail when upload fails', async () => {
    mockMetricRepo.findByType.mockResolvedValue([
      { metricType: MetricType.REVENUE, entityId: 'e1', value: 100, timestamp: new Date() },
    ]);
    mockReportStorage.upload.mockRejectedValue(new Error('S3 error'));

    const command = new GenerateReportCommand(
      'EVENT_REVENUE',
      'org-1',
      'CSV',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('UPLOAD_FAILED');
  });

  it('should use TICKET_SOLD metric type for TICKET_SALES report', async () => {
    mockMetricRepo.findByType.mockResolvedValue([
      { metricType: MetricType.TICKET_SOLD, entityId: 'e1', value: 10, timestamp: new Date() },
    ]);

    const command = new GenerateReportCommand(
      'TICKET_SALES',
      'org-1',
      'CSV',
      new Date('2025-01-01'),
      new Date('2025-06-01'),
    );

    await handler.execute(command);

    expect(mockMetricRepo.findByType).toHaveBeenCalledWith(
      MetricType.TICKET_SOLD,
      expect.any(Date),
      expect.any(Date),
    );
  });
});
