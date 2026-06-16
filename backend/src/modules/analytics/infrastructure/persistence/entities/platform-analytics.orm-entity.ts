import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * PlatformAnalytics TypeORM Entity
 *
 * Maps to the analytics.platform_analytics table.
 * Materialized read model, one row per period.
 */
@Entity({ name: 'platform_analytics', schema: 'analytics' })
@Unique('uq_platform_analytics_period', ['periodStart', 'periodEnd'])
export class PlatformAnalyticsOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  @Index('idx_platform_analytics_period')
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 15, scale: 3, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  @Column({ name: 'platform_commission', type: 'decimal', precision: 15, scale: 3, default: 0 })
  platformCommission!: number;

  @Column({ name: 'total_events', type: 'int', default: 0 })
  totalEvents!: number;

  @Column({ name: 'total_tickets_sold', type: 'int', default: 0 })
  totalTicketsSold!: number;

  @Column({ name: 'active_users', type: 'int', default: 0 })
  activeUsers!: number;

  @Column({ name: 'conversion_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ name: 'revenue_by_category', type: 'jsonb', default: '[]' })
  revenueByCategory!: { category: string; revenue: number; percentage: number }[];

  @Column({ name: 'top_events', type: 'jsonb', default: '[]' })
  topEvents!: { eventId: string; title: string; revenue: number; ticketsSold: number }[];

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamptz' })
  lastUpdated!: Date;
}
