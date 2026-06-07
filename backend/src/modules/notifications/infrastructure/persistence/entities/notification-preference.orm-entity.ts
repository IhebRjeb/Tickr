import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * NotificationPreference TypeORM Entity
 *
 * Maps to the notifications.notification_preferences table in PostgreSQL.
 */
@Entity({ name: 'notification_preferences', schema: 'notifications' })
export class NotificationPreferenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index('idx_notification_preferences_user_id')
  userId!: string;

  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled!: boolean;

  @Column({ name: 'sms_enabled', type: 'boolean', default: true })
  smsEnabled!: boolean;

  @Column({ name: 'marketing_enabled', type: 'boolean', default: false })
  marketingEnabled!: boolean;

  @Column({ name: 'event_reminders_enabled', type: 'boolean', default: true })
  eventRemindersEnabled!: boolean;

  @Column({ name: 'unsubscribe_token', type: 'varchar', length: 64, unique: true })
  @Index('idx_notification_preferences_unsubscribe_token')
  unsubscribeToken!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
