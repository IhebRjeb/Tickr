import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.vo';

/**
 * Payment TypeORM Entity
 *
 * Maps to the payments.payments table in PostgreSQL.
 * Records each payment attempt for an order.
 *
 * @see PaymentEntity for domain logic
 */
@Entity({ name: 'payments', schema: 'payments' })
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  @Index('idx_payments_order_id')
  orderId!: string;

  @Column({ name: 'amount_value', type: 'decimal', precision: 12, scale: 3 })
  amountValue!: number;

  @Column({ name: 'amount_currency', type: 'varchar', length: 3 })
  amountCurrency!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: PaymentMethod;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse!: Record<string, unknown> | null;

  @Column({ name: 'gateway_payment_ref', type: 'varchar', length: 255, nullable: true })
  gatewayPaymentRef!: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'attempt_number', type: 'integer', default: 1 })
  attemptNumber!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
