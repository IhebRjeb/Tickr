import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { Currency } from '../../../domain/value-objects/currency.vo';
import { EventCategory } from '../../../domain/value-objects/event-category.vo';
import { EventStatus } from '../../../domain/value-objects/event-status.vo';

import { TicketTypeOrmEntity } from './ticket-type.orm-entity';

/**
 * Event TypeORM Entity
 *
 * Maps to the events.events table in PostgreSQL.
 * This is the persistence model, separate from the domain model (EventEntity).
 *
 * Relationships:
 * - OneToMany with TicketTypeOrmEntity (cascade delete)
 *
 * @see EventEntity for domain logic
 */
@Entity({ name: 'events', schema: 'events' })
export class EventOrmEntity {
  // ============================================
  // Primary Key
  // ============================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Core Fields
  // ============================================

  @Column({ name: 'organizer_id', type: 'uuid' })
  @Index('idx_events_organizer')
  organizerId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_events_category')
  category!: EventCategory;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
  @Index('idx_events_status')
  status!: EventStatus;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({
    name: 'commission_rate_override',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  commissionRateOverride!: number | null;

  // ============================================
  // Location Fields (Embedded)
  // ============================================

  @Column({ name: 'location_address', type: 'text', nullable: true })
  locationAddress!: string | null;

  @Column({ name: 'location_city', type: 'varchar', length: 100 })
  locationCity!: string;

  @Column({ name: 'location_country', type: 'varchar', length: 100 })
  locationCountry!: string;

  @Column({ name: 'location_postal_code', type: 'varchar', length: 20, nullable: true })
  locationPostalCode!: string | null;

  @Column({ name: 'location_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  locationLat!: number | null;

  @Column({ name: 'location_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  locationLng!: number | null;

  // ============================================
  // Date Fields
  // ============================================

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate!: Date;

  @Column({ name: 'is_multi_day', type: 'boolean', default: false })
  isMultiDay!: boolean;

  // ============================================
  // Capacity and Revenue
  // ============================================

  @Column({ name: 'total_capacity', type: 'integer', default: 0 })
  totalCapacity!: number;

  @Column({ name: 'sold_tickets', type: 'integer', default: 0 })
  soldTickets!: number;

  @Column({ name: 'revenue_amount', type: 'decimal', precision: 12, scale: 3, default: 0 })
  revenueAmount!: number;

  @Column({ name: 'revenue_currency', type: 'varchar', length: 3, default: Currency.TND })
  revenueCurrency!: Currency;

  // ============================================
  // Timestamps
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  // ============================================
  // Relationships
  // ============================================

  @OneToMany(() => TicketTypeOrmEntity, (ticketType) => ticketType.event, {
    cascade: true,
    eager: false,
  })
  ticketTypes!: TicketTypeOrmEntity[];
}
