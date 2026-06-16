// ============================================
// Platform Analytics DTO
// ============================================

export interface CategoryRevenueDto {
  readonly category: string;
  readonly revenue: number;
  readonly percentage: number;
}

export interface TopEventDto {
  readonly eventId: string;
  readonly title: string;
  readonly revenue: number;
  readonly ticketsSold: number;
}

export interface PlatformAnalyticsDto {
  readonly id: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly totalRevenue: number;
  readonly currency: string;
  readonly platformCommission: number;
  readonly totalEvents: number;
  readonly totalTicketsSold: number;
  readonly activeUsers: number;
  readonly conversionRate: number;
  readonly revenueByCategory: CategoryRevenueDto[];
  readonly topEvents: TopEventDto[];
  readonly lastUpdated: Date;
}
