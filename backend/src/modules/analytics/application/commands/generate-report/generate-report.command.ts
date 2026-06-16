import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types
// ============================================

export type ReportFormat = 'CSV' | 'PDF';

export type ReportType = 'EVENT_REVENUE' | 'PLATFORM_SUMMARY' | 'TICKET_SALES';

export type GenerateReportError =
  | { type: 'INVALID_FILTERS'; message: string }
  | { type: 'NO_DATA'; message: string }
  | { type: 'GENERATION_FAILED'; message: string }
  | { type: 'UPLOAD_FAILED'; message: string };

export type GenerateReportResult = {
  readonly reportId: string;
  readonly url: string;
  readonly format: ReportFormat;
};

// ============================================
// Command
// ============================================

export class GenerateReportCommand extends BaseCommand {
  constructor(
    public readonly reportType: ReportType,
    public readonly organizerId: string,
    public readonly format: ReportFormat,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly eventId?: string,
  ) {
    super();
    Object.freeze(this);
  }
}
