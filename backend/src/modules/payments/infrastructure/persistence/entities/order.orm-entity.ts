import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { OrderStatus } from '../../../domain/value-objects/order-status.vo';
import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';

import { OrderItemOrmEntity } from './order-item.orm-entity';

/**
 * Order TypeORM Entity
 *
 * Maps to the payments.orders table in PostgreSQL.
 * This is the persistence model, separate from the domain model (OrderEntity).
 *
 * @see OrderEntity for domain logic
 */
@Entity({ name: 'orders', schema: 'payments' })
export class OrderOrmEntity {
  // ============================================
  // Primary Key
  // ============================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Foreign Keys (Soft References)
  // ============================================

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_orders_user_id')
  userId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  @Index('idx_orders_event_id')
  eventId!: string;

  // ============================================
  // Status & Payment Info
  // ============================================

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  @Index('idx_orders_status')
  status!: OrderStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @Column({ name: 'payment_gateway_order_id', type: 'varchar', length: 255, nullable: true })
  paymentGatewayOrderId!: string | null;

  @Column({ name: 'payment_intent_id', type: 'varchar', length: 255, nullable: true })
  paymentIntentId!: string | null;

  @Column({ name: 'gateway_payment_ref', type: 'varchar', length: 255, nullable: true })
  gatewayPaymentRef!: string | null;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId!: string | null;

  // ============================================
  // Financial Fields
  // ============================================

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 12, scale: 3 })
  subtotalAmount!: number;

  @Column({ name: 'platform_fee_amount', type: 'decimal', precision: 12, scale: 3 })
  platformFeeAmount!: number;

  @Column({ name: 'payment_fees_amount', type: 'decimal', precision: 12, scale: 3, default: 0 })
  paymentFeesAmount!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 3 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  // ============================================
  // Lifecycle Dates
  // ============================================

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index('idx_orders_expires_at')
  expiresAt!: Date;

  // ============================================
  // Metadata
  // ============================================

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // ============================================
  // Timestamps
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  // ============================================
  // Relationships
  // ============================================

  @OneToMany(() => OrderItemOrmEntity, (item) => item.order, {
    cascade: true,
    eager: false,
  })
  items!: OrderItemOrmEntity[];
}
