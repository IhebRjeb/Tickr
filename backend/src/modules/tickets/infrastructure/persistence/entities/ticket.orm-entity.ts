import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Ticket TypeORM Entity
 *
 * Maps to the tickets.tickets table in PostgreSQL.
 * This is the persistence model, separate from the domain model (TicketEntity).
 *
 * @see TicketEntity for domain logic
 */
@Entity({ name: 'tickets', schema: 'tickets' })
export class TicketOrmEntity {
  // ============================================
  // Primary Key
  // ============================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Foreign Keys (Soft References)
  // ============================================

  @Column({ name: 'event_id', type: 'uuid' })
  @Index('idx_tickets_event_id')
  eventId!: string;

  @Column({ name: 'ticket_type_id', type: 'uuid' })
  ticketTypeId!: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_tickets_user_id')
  userId!: string;

  // ============================================
  // QR Code & Status
  // ============================================

  @Column({ name: 'qr_code', type: 'varchar', length: 100, unique: true })
  @Index('idx_tickets_qr_code')
  qrCode!: string;

  @Column({ type: 'varchar', length: 20, default: 'RESERVED' })
  @Index('idx_tickets_status')
  status!: string;

  // ============================================
  // Price Fields
  // ============================================

  @Column({ name: 'price_amount', type: 'decimal', precision: 10, scale: 2 })
  priceAmount!: number;

  @Column({ name: 'price_currency', type: 'varchar', length: 3, default: 'TND' })
  priceCurrency!: string;

  // ============================================
  // Holder Information
  // ============================================

  @Column({ name: 'holder_name', type: 'varchar', length: 200 })
  holderName!: string;

  @Column({ name: 'holder_email', type: 'varchar', length: 255 })
  holderEmail!: string;

  @Column({ name: 'holder_phone', type: 'varchar', length: 20, nullable: true })
  holderPhone!: string | null;

  // ============================================
  // Check-in Fields
  // ============================================

  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt!: Date | null;

  @Column({ name: 'checked_in_by', type: 'uuid', nullable: true })
  checkedInBy!: string | null;

  // ============================================
  // Transfer Fields
  // ============================================

  @Column({ name: 'transferred_to', type: 'uuid', nullable: true })
  transferredTo!: string | null;

  @Column({ name: 'transferred_at', type: 'timestamp', nullable: true })
  transferredAt!: Date | null;

  @Column({ name: 'transfer_count', type: 'integer', default: 0 })
  transferCount!: number;

  // ============================================
  // Reservation & PDF
  // ============================================

  @Column({ name: 'reserved_until', type: 'timestamp', nullable: true })
  reservedUntil!: Date | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;

  // ============================================
  // Timestamps
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
