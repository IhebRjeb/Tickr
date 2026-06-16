// ============================================
// Revenue Report DTO
// ============================================

export interface RevenueReportDto {
  readonly reportId: string;
  readonly reportType: string;
  readonly format: 'CSV' | 'PDF';
  readonly url: string;
  readonly generatedAt: Date;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly totalRevenue: number;
  readonly currency: string;
  readonly totalTransactions: number;
}
