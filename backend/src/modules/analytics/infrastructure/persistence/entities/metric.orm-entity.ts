import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Metric TypeORM Entity
 *
 * Maps to the analytics.metrics table in PostgreSQL.
 * Append-only: metrics are never updated or deleted.
 */
@Entity({ name: 'metrics', schema: 'analytics' })
@Index('idx_metrics_entity_id_type', ['entityId', 'entityType'])
@Index('idx_metrics_metric_type_timestamp', ['metricType', 'timestamp'])
export class MetricOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'metric_type', type: 'varchar', length: 30 })
  @Index('idx_metrics_metric_type')
  metricType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index('idx_metrics_entity_id')
  entityId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType!: string;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  value!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz' })
  @Index('idx_metrics_timestamp')
  timestamp!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
