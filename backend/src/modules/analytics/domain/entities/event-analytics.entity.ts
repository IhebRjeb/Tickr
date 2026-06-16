import { Result } from '@shared/domain/result';

import { TimeSeriesDataVO } from '../value-objects/time-series-data.vo';

// ============================================
// Types
// ============================================

type AnalyticsError = { type: string; message: string };

export type EventAnalyticsProps = {
  eventId: string;
  totalRevenue: number;
  currency: string;
  totalTicketsSold: number;
  totalCapacity: number;
  checkInCount: number;
  conversionRate: number;
  averageTicketPrice: number;
  topSellingTicketType: string | null;
  salesByDay: TimeSeriesDataVO[];
  checkInsByHour: TimeSeriesDataVO[];
  lastUpdated: Date;
};

// ============================================
// EventAnalytics Entity (Read Model)
// ============================================

/**
 * EventAnalytics Entity
 *
 * A calculated read model that aggregates metrics for a single event.
 * Refreshed periodically from recorded metrics.
 */
export class EventAnalyticsEntity {
  private constructor(private readonly props: EventAnalyticsProps) {}

  // ============================================
  // Factory Methods
  // ============================================

  static create(props: EventAnalyticsProps): Result<EventAnalyticsEntity, AnalyticsError> {
    if (!props.eventId) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Event ID is required for event analytics',
      });
    }

    if (props.totalRevenue < 0) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Total revenue cannot be negative',
      });
    }

    return Result.ok(new EventAnalyticsEntity(props));
  }

  static reconstitute(props: EventAnalyticsProps): EventAnalyticsEntity {
    return new EventAnalyticsEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get eventId(): string {
    return this.props.eventId;
  }

  get totalRevenue(): number {
    return this.props.totalRevenue;
  }

  get currency(): string {
    return this.props.currency;
  }

  get totalTicketsSold(): number {
    return this.props.totalTicketsSold;
  }

  get totalCapacity(): number {
    return this.props.totalCapacity;
  }

  get checkInCount(): number {
    return this.props.checkInCount;
  }

  get averageTicketPrice(): number {
    return this.props.averageTicketPrice;
  }

  get topSellingTicketType(): string | null {
    return this.props.topSellingTicketType;
  }

  get salesByDay(): TimeSeriesDataVO[] {
    return [...this.props.salesByDay];
  }

  get checkInsByHour(): TimeSeriesDataVO[] {
    return [...this.props.checkInsByHour];
  }

  get lastUpdated(): Date {
    return this.props.lastUpdated;
  }

  // ============================================
  // Domain Logic
  // ============================================

  getConversionRate(): number {
    if (this.props.totalCapacity === 0) return 0;
    return Math.round(
      (this.props.totalTicketsSold / this.props.totalCapacity) * 10000,
    ) / 100;
  }

  getCheckInRate(): number {
    if (this.props.totalTicketsSold === 0) return 0;
    return Math.round(
      (this.props.checkInCount / this.props.totalTicketsSold) * 10000,
    ) / 100;
  }

  getRevenueGrowth(previous: EventAnalyticsEntity): number {
    if (previous.totalRevenue === 0) {
      return this.props.totalRevenue > 0 ? 100 : 0;
    }
    return Math.round(
      ((this.props.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 10000,
    ) / 100;
  }
}
