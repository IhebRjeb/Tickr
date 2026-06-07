import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Notification TypeORM Entity
 *
 * Maps to the notifications.notifications table in PostgreSQL.
 */
@Entity({ name: 'notifications', schema: 'notifications' })
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_notifications_user_id')
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  @Index('idx_notifications_type')
  type!: string;

  @Column({ type: 'varchar', length: 10 })
  channel!: string;

  @Column({ type: 'varchar', length: 10, default: 'MEDIUM' })
  priority!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'template_id', type: 'varchar', length: 100, nullable: true })
  templateId!: string | null;

  @Column({ name: 'template_data', type: 'jsonb', default: '{}' })
  templateData!: Record<string, unknown>;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail!: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20, nullable: true })
  recipientPhone!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  @Index('idx_notifications_status')
  status!: string;

  @Column({ name: 'scheduled_for', type: 'timestamp', nullable: true })
  @Index('idx_notifications_scheduled_for')
  scheduledFor!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount!: number;

  @Column({ name: 'max_retries', type: 'integer', default: 3 })
  maxRetries!: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
