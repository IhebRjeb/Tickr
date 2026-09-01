import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { InvalidCheckInException } from '../exceptions/invalid-check-in.exception';

// ============================================
// Internal Interfaces (Not Exported)
// ============================================

/**
 * Props for creating a new check-in record
 * @internal
 */
interface CreateCheckInProps {
  id?: string;
  ticketId: string;
  eventId: string;
  staffId: string;
  deviceId: string;
  locationGate: string;
  isValid: boolean;
  failureReason?: string | null;
  authorizationSource?: 'OWNER' | 'ADMIN' | 'ASSIGNMENT' | 'LEGACY';
  assignmentId?: string | null;
}

/**
 * Props for reconstituting a check-in from persistence
 * @internal
 */
interface CheckInProps {
  id: string;
  ticketId: string;
  eventId: string;
  staffId: string;
  deviceId: string;
  locationGate: string;
  timestamp: Date;
  isValid: boolean;
  failureReason: string | null;
  authorizationSource?: 'OWNER' | 'ADMIN' | 'ASSIGNMENT' | 'LEGACY';
  assignmentId?: string | null;
  createdAt: Date;
}

/**
 * CheckIn Entity (Audit Trail)
 *
 * Records every check-in attempt at a venue entrance.
 * Stores both successful and failed attempts for audit and fraud detection.
 *
 * This is NOT an aggregate root — it is created by the application layer
 * after the Ticket aggregate processes a check-in command.
 */
export class CheckInEntity extends BaseEntity<CheckInEntity> {
  private _ticketId: string;
  private _eventId: string;
  private _staffId: string;
  private _deviceId: string;
  private _locationGate: string;
  private _timestamp: Date;
  private _isValid: boolean;
  private _failureReason: string | null;
  private readonly _authorizationSource: 'OWNER' | 'ADMIN' | 'ASSIGNMENT' | 'LEGACY';
  private readonly _assignmentId: string | null;

  private constructor(props: CheckInProps) {
    super(props.id, props.createdAt);
    this._ticketId = props.ticketId;
    this._eventId = props.eventId;
    this._staffId = props.staffId;
    this._deviceId = props.deviceId;
    this._locationGate = props.locationGate;
    this._timestamp = props.timestamp;
    this._isValid = props.isValid;
    this._failureReason = props.failureReason;
    this._authorizationSource = props.authorizationSource ?? 'LEGACY';
    this._assignmentId = props.assignmentId ?? null;
  }

  // ============================================
  // Getters
  // ============================================

  get ticketId(): string {
    return this._ticketId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get staffId(): string {
    return this._staffId;
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get locationGate(): string {
    return this._locationGate;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get isValid(): boolean {
    return this._isValid;
  }

  get failureReason(): string | null {
    return this._failureReason;
  }

  get authorizationSource(): 'OWNER' | 'ADMIN' | 'ASSIGNMENT' | 'LEGACY' {
    return this._authorizationSource;
  }

  get assignmentId(): string | null {
    return this._assignmentId;
  }

  // ============================================
  // Command Methods
  // ============================================

  /**
   * Mark this check-in attempt as invalid after the fact
   */
  markAsInvalid(reason: string): void {
    this._isValid = false;
    this._failureReason = reason;
    this.touch();
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a new check-in record
   */
  static create(
    props: CreateCheckInProps,
  ): Result<CheckInEntity, InvalidCheckInException> {
    if (!props.ticketId || !isUUID(props.ticketId)) {
      return Result.fail(InvalidCheckInException.invalidUUID('ticketId'));
    }

    if (!props.eventId || !isUUID(props.eventId)) {
      return Result.fail(InvalidCheckInException.invalidUUID('eventId'));
    }

    if (!props.staffId || !isUUID(props.staffId)) {
      return Result.fail(InvalidCheckInException.invalidUUID('staffId'));
    }

    if (!props.deviceId || !props.deviceId.trim()) {
      return Result.fail(InvalidCheckInException.missingDeviceId());
    }

    if (!props.locationGate || !props.locationGate.trim()) {
      return Result.fail(InvalidCheckInException.missingLocationGate());
    }

    if (props.assignmentId && !isUUID(props.assignmentId)) {
      return Result.fail(InvalidCheckInException.invalidUUID('assignmentId'));
    }

    const authorizationSource = props.authorizationSource ?? 'LEGACY';
    if (
      authorizationSource === 'ASSIGNMENT' &&
      !props.assignmentId
    ) {
      return Result.fail(
        InvalidCheckInException.missingAssignmentForAuthorization(),
      );
    }

    const id = props.id || generateUUID();

    const checkIn = new CheckInEntity({
      id,
      ticketId: props.ticketId,
      eventId: props.eventId,
      staffId: props.staffId,
      deviceId: props.deviceId.trim(),
      locationGate: props.locationGate.trim(),
      timestamp: new Date(),
      isValid: props.isValid,
      failureReason: props.failureReason?.trim() || null,
      authorizationSource,
      assignmentId: props.assignmentId ?? null,
      createdAt: new Date(),
    });

    return Result.ok(checkIn);
  }

  /**
   * Reconstitute a check-in from persistence
   * No validation — assumes data is valid from DB
   */
  static reconstitute(props: CheckInProps): CheckInEntity {
    return new CheckInEntity(props);
  }

  // ============================================
  // BaseEntity Implementation
  // ============================================

  clone(): CheckInEntity {
    return new CheckInEntity({
      id: this._id,
      ticketId: this._ticketId,
      eventId: this._eventId,
      staffId: this._staffId,
      deviceId: this._deviceId,
      locationGate: this._locationGate,
      timestamp: this._timestamp,
      isValid: this._isValid,
      failureReason: this._failureReason,
      authorizationSource: this._authorizationSource,
      assignmentId: this._assignmentId,
      createdAt: this._createdAt,
    });
  }

  validate(): void {
    if (!this._ticketId || !isUUID(this._ticketId)) {
      throw InvalidCheckInException.invalidUUID('ticketId');
    }
    if (!this._eventId || !isUUID(this._eventId)) {
      throw InvalidCheckInException.invalidUUID('eventId');
    }
    if (!this._staffId || !isUUID(this._staffId)) {
      throw InvalidCheckInException.invalidUUID('staffId');
    }
  }
}
