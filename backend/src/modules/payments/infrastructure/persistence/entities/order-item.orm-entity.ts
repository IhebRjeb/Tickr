import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { OrderOrmEntity } from './order.orm-entity';

/**
 * OrderItem TypeORM Entity
 *
 * Maps to the payments.order_items table in PostgreSQL.
 *
 * @see OrderItemEntity for domain logic
 */
@Entity({ name: 'order_items', schema: 'payments' })
export class OrderItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'ticket_type_id', type: 'uuid' })
  ticketTypeId!: string;

  @Column({ name: 'ticket_type_name', type: 'varchar', length: 200 })
  ticketTypeName!: string;

  @Column({ name: 'price_amount', type: 'decimal', precision: 12, scale: 3 })
  priceAmount!: number;

  @Column({ name: 'price_currency', type: 'varchar', length: 3 })
  priceCurrency!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  // ============================================
  // Relationships
  // ============================================

  @ManyToOne(() => OrderOrmEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderOrmEntity;
}
