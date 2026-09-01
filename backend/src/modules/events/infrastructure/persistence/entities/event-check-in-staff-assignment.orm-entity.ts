import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'event_check_in_staff_assignments', schema: 'events' })
@Index(
  'uq_event_check_in_staff_active',
  ['eventId', 'userId'],
  { unique: true, where: '"revoked_at" IS NULL' },
)
@Index(
  'idx_event_check_in_staff_active_event',
  ['eventId', 'assignedAt'],
  { where: '"revoked_at" IS NULL' },
)
@Index(
  'idx_event_check_in_staff_active_user',
  ['userId', 'eventId'],
  { where: '"revoked_at" IS NULL' },
)
export class EventCheckInStaffAssignmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedBy!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}