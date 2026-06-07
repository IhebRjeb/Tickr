import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * NotificationTemplate TypeORM Entity
 *
 * Maps to the notifications.notification_templates table in PostgreSQL.
 */
@Entity({ name: 'notification_templates', schema: 'notifications' })
export class NotificationTemplateOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index('idx_notification_templates_slug')
  slug!: string;

  @Column({ type: 'varchar', length: 10 })
  channel!: string;

  @Column({ type: 'varchar', length: 20 })
  category!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'required_variables', type: 'jsonb', default: '[]' })
  requiredVariables!: string[];

  @Column({ name: 'default_variables', type: 'jsonb', default: '{}' })
  defaultVariables!: Record<string, string>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
