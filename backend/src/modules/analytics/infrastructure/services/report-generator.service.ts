import { Injectable, Logger } from '@nestjs/common';

/**
 * Report Generator Service
 *
 * Generates CSV and PDF reports from analytics data.
 */
@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  generateCSV(
    data: Record<string, unknown>[],
    columns: string[],
  ): Buffer {
    if (data.length === 0) {
      return Buffer.from(columns.join(',') + '\n', 'utf-8');
    }

    const header = columns.join(',');
    const rows = data.map((row) =>
      columns.map((col) => this.escapeCSVField(String(row[col] ?? ''))).join(','),
    );

    return Buffer.from([header, ...rows].join('\n'), 'utf-8');
  }

  generatePDF(
    data: Record<string, unknown>[],
    title: string,
  ): Buffer {
    // Simplified PDF generation — text-based content
    // In production, use pdfkit for proper PDF rendering
    const lines: string[] = [
      `Report: ${title}`,
      `Generated: ${new Date().toISOString()}`,
      `Total Records: ${data.length}`,
      '---',
    ];

    for (const row of data.slice(0, 100)) {
      lines.push(
        Object.entries(row)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | '),
      );
    }

    if (data.length > 100) {
      lines.push(`... and ${data.length - 100} more records`);
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
