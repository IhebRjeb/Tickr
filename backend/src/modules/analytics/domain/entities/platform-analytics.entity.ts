import { Result } from '@shared/domain/result';

// ============================================
// Types
// ============================================

type AnalyticsError = { type: string; message: string };

export type CategoryRevenue = {
  category: string;
  revenue: number;
  percentage: number;
};

export type TopEvent = {
  eventId: string;
  title: string;
  revenue: number;
  ticketsSold: number;
};

export type PlatformAnalyticsProps = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  currency: string;
  platformCommission: number;
  totalEvents: number;
  totalTicketsSold: number;
  activeUsers: number;
  conversionRate: number;
  revenueByCategory: CategoryRevenue[];
  topEvents: TopEvent[];
  lastUpdated: Date;
};

// ============================================
// PlatformAnalytics Entity (Read Model)
// ============================================

/**
 * PlatformAnalytics Entity
 *
 * A calculated read model for platform-wide metrics over a given period.
 * Refreshed periodically from aggregated metric data.
 */
export class PlatformAnalyticsEntity {
  private constructor(private readonly props: PlatformAnalyticsProps) {}

  // ============================================
  // Factory Methods
  // ============================================

  static create(props: PlatformAnalyticsProps): Result<PlatformAnalyticsEntity, AnalyticsError> {
    if (!props.id) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Platform analytics requires an ID',
      });
    }

    if (props.periodStart >= props.periodEnd) {
      return Result.fail({
        type: 'INVALID_TIME_RANGE',
        message: 'Period start must be before period end',
      });
    }

    if (props.totalRevenue < 0) {
      return Result.fail({
        type: 'INVALID_METRIC',
        message: 'Total revenue cannot be negative',
      });
    }

    return Result.ok(new PlatformAnalyticsEntity(props));
  }

  static reconstitute(props: PlatformAnalyticsProps): PlatformAnalyticsEntity {
    return new PlatformAnalyticsEntity(props);
  }

  // ============================================
  // Getters
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get periodStart(): Date {
    return this.props.periodStart;
  }

  get periodEnd(): Date {
    return this.props.periodEnd;
  }

  get totalRevenue(): number {
    return this.props.totalRevenue;
  }

  get currency(): string {
    return this.props.currency;
  }

  get platformCommission(): number {
    return this.props.platformCommission;
  }

  get totalEvents(): number {
    return this.props.totalEvents;
  }

  get totalTicketsSold(): number {
    return this.props.totalTicketsSold;
  }

  get activeUsers(): number {
    return this.props.activeUsers;
  }

  get conversionRate(): number {
    return this.props.conversionRate;
  }

  get revenueByCategory(): CategoryRevenue[] {
    return [...this.props.revenueByCategory];
  }

  get topEvents(): TopEvent[] {
    return [...this.props.topEvents];
  }

  get lastUpdated(): Date {
    return this.props.lastUpdated;
  }

  // ============================================
  // Domain Logic
  // ============================================

  getGrowthRate(previous: PlatformAnalyticsEntity): number {
    if (previous.totalRevenue === 0) {
      return this.props.totalRevenue > 0 ? 100 : 0;
    }
    return Math.round(
      ((this.props.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 10000,
    ) / 100;
  }

  getTopPerformers(limit: number): TopEvent[] {
    return [...this.props.topEvents]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}
