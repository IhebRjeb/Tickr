import type { EventAnalyticsDto } from './event-analytics.dto';
import type { TimeSeriesDto } from './time-series.dto';

// ============================================
// Organizer Dashboard DTO
// ============================================

export interface OrganizerDashboardDto {
  readonly organizerId: string;
  readonly totalRevenue: number;
  readonly currency: string;
  readonly totalEvents: number;
  readonly totalTicketsSold: number;
  readonly averageCheckInRate: number;
  readonly revenueTimeline: TimeSeriesDto[];
  readonly events: EventAnalyticsDto[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}
