import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Check-In TypeORM Entity
 *
 * Maps to the tickets.check_ins table in PostgreSQL.
 * Records every check-in attempt (both valid and invalid) for audit purposes.
 *
 * @see CheckInEntity for domain logic
 */
@Entity({ name: 'check_ins', schema: 'tickets' })
export class CheckInOrmEntity {
  // ============================================
  // Primary Key
  // ============================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Foreign Keys
  // ============================================

  @Column({ name: 'ticket_id', type: 'uuid' })
  @Index('idx_check_ins_ticket_id')
  ticketId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  @Index('idx_check_ins_event_id')
  eventId!: string;

  // ============================================
  // Staff & Device
  // ============================================

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId!: string;

  @Column({ name: 'device_id', type: 'varchar', length: 100 })
  deviceId!: string;

  // ============================================
  // Check-in Details
  // ============================================

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_check_ins_timestamp')
  timestamp!: Date;

  @Column({ name: 'location_gate', type: 'varchar', length: 50, nullable: true })
  locationGate!: string | null;

  // ============================================
  // Validation Result
  // ============================================

  @Column({ name: 'is_valid', type: 'boolean', default: true })
  isValid!: boolean;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({
    name: 'authorization_source',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  authorizationSource!: string | null;

  @Column({ name: 'assignment_id', type: 'uuid', nullable: true })
  assignmentId!: string | null;

  // ============================================
  // Timestamps
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
