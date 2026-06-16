import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { generateUUID } from '@shared/domain/utils';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { ReportGeneratedEvent } from '../../../domain/events/report-generated.event';
import { MetricType } from '../../../domain/value-objects/metric-type.vo';
import { ANALYTICS_CACHE } from '../../ports/cache.port';
import type { CachePort } from '../../ports/cache.port';
import { METRIC_REPOSITORY } from '../../ports/metric.repository.port';
import type { MetricRepositoryPort } from '../../ports/metric.repository.port';
import { REPORT_STORAGE } from '../../ports/report-storage.port';
import type { ReportStoragePort } from '../../ports/report-storage.port';

import type { GenerateReportError, GenerateReportResult } from './generate-report.command';
import { GenerateReportCommand } from './generate-report.command';

// ============================================
// Constants
// ============================================

const MAX_EXPORT_ROWS = 10_000;

// ============================================
// Handler
// ============================================

/**
 * GenerateReportHandler
 *
 * Generates CSV/PDF reports from analytics data and uploads to storage.
 */
@Injectable()
export class GenerateReportHandler {
  private readonly logger = new Logger(GenerateReportHandler.name);

  constructor(
    @Inject(METRIC_REPOSITORY)
    private readonly metricRepository: MetricRepositoryPort,
    @Inject(REPORT_STORAGE)
    private readonly reportStorage: ReportStoragePort,
    @Inject(ANALYTICS_CACHE)
    private readonly cache: CachePort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: GenerateReportCommand,
  ): Promise<Result<GenerateReportResult, GenerateReportError>> {
    this.logger.debug(
      `Generating ${command.format} report: ${command.reportType} for organizer ${command.organizerId}`,
    );

    // 1. Validate time range
    if (command.startDate >= command.endDate) {
      return Result.fail({
        type: 'INVALID_FILTERS',
        message: 'Start date must be before end date',
      });
    }

    const spanMs = command.endDate.getTime() - command.startDate.getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (spanMs > oneYearMs) {
      return Result.fail({
        type: 'INVALID_FILTERS',
        message: 'Time range cannot exceed 1 year',
      });
    }

    // 2. Fetch metrics for the report
    const metricType = this.getMetricTypeForReport(command.reportType);
    const metrics = await this.metricRepository.findByType(
      metricType,
      command.startDate,
      command.endDate,
    );

    if (metrics.length === 0) {
      return Result.fail({
        type: 'NO_DATA',
        message: 'No data available for the selected filters',
      });
    }

    // Enforce max rows
    const limitedMetrics = metrics.slice(0, MAX_EXPORT_ROWS);

    // 3. Generate report content
    let content: Buffer;
    let contentType: string;

    try {
      if (command.format === 'CSV') {
        content = this.generateCSV(limitedMetrics);
        contentType = 'text/csv';
      } else {
        content = this.generatePDF(limitedMetrics);
        contentType = 'application/pdf';
      }
    } catch (error) {
      this.logger.error(`Report generation failed: ${(error as Error).message}`);
      return Result.fail({
        type: 'GENERATION_FAILED',
        message: 'Failed to generate report content',
      });
    }

    // 4. Upload to storage
    const reportId = generateUUID();
    const fileName = `reports/${command.organizerId}/${reportId}.${command.format.toLowerCase()}`;

    let url: string;
    try {
      await this.reportStorage.upload(fileName, content, contentType);
      url = await this.reportStorage.getSignedUrl(fileName, 3600);
    } catch (error) {
      this.logger.error(`Report upload failed: ${(error as Error).message}`);
      return Result.fail({
        type: 'UPLOAD_FAILED',
        message: 'Failed to upload report',
      });
    }

    // 5. Publish event
    await this.eventPublisher.publish(
      new ReportGeneratedEvent(reportId, command.reportType, command.format, url),
    );

    this.logger.log(`Report generated: ${reportId} (${command.format})`);

    return Result.ok({ reportId, url, format: command.format });
  }

  private getMetricTypeForReport(reportType: string): MetricType {
    switch (reportType) {
      case 'EVENT_REVENUE':
      case 'PLATFORM_SUMMARY':
        return MetricType.REVENUE;
      case 'TICKET_SALES':
        return MetricType.TICKET_SOLD;
      default:
        return MetricType.REVENUE;
    }
  }

  private generateCSV(metrics: { metricType: string; entityId: string; value: number; timestamp: Date }[]): Buffer {
    const header = 'metricType,entityId,value,timestamp\n';
    const rows = metrics
      .map((m) => `${m.metricType},${m.entityId},${m.value},${m.timestamp.toISOString()}`)
      .join('\n');
    return Buffer.from(header + rows, 'utf-8');
  }

  private generatePDF(metrics: { metricType: string; entityId: string; value: number; timestamp: Date }[]): Buffer {
    // Placeholder: PDF generation delegated to infrastructure service
    const content = JSON.stringify(
      metrics.map((m) => ({
        type: m.metricType,
        entity: m.entityId,
        value: m.value,
        time: m.timestamp.toISOString(),
      })),
    );
    return Buffer.from(content, 'utf-8');
  }
}
