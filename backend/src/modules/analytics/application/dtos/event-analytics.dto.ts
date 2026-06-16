import type { TimeSeriesDto } from './time-series.dto';

// ============================================
// Event Analytics DTO
// ============================================

export interface EventAnalyticsDto {
  readonly eventId: string;
  readonly totalRevenue: number;
  readonly currency: string;
  readonly totalTicketsSold: number;
  readonly totalCapacity: number;
  readonly checkInCount: number;
  readonly checkInRate: number;
  readonly conversionRate: number;
  readonly averageTicketPrice: number;
  readonly topSellingTicketType: string | null;
  readonly salesByDay: TimeSeriesDto[];
  readonly checkInsByHour: TimeSeriesDto[];
  readonly lastUpdated: Date;
}
