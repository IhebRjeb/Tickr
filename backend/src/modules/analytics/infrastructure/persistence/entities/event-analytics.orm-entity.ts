import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * EventAnalytics TypeORM Entity
 *
 * Maps to the analytics.event_analytics table.
 * Materialized read model, refreshed periodically.
 */
@Entity({ name: 'event_analytics', schema: 'analytics' })
export class EventAnalyticsOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 15, scale: 3, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  @Column({ name: 'total_tickets_sold', type: 'int', default: 0 })
  totalTicketsSold!: number;

  @Column({ name: 'total_capacity', type: 'int', default: 0 })
  totalCapacity!: number;

  @Column({ name: 'check_in_count', type: 'int', default: 0 })
  checkInCount!: number;

  @Column({ name: 'conversion_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ name: 'average_ticket_price', type: 'decimal', precision: 12, scale: 3, default: 0 })
  averageTicketPrice!: number;

  @Column({ name: 'top_selling_ticket_type', type: 'varchar', length: 255, nullable: true })
  topSellingTicketType!: string | null;

  @Column({ name: 'sales_by_day', type: 'jsonb', default: '[]' })
  salesByDay!: { timestamp: string; value: number; label?: string }[];

  @Column({ name: 'check_ins_by_hour', type: 'jsonb', default: '[]' })
  checkInsByHour!: { timestamp: string; value: number; label?: string }[];

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamptz' })
  @Index('idx_event_analytics_last_updated')
  lastUpdated!: Date;
}
