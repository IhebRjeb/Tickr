import { BaseEntity } from '@shared/domain/base-entity';
import { Result } from '@shared/domain/result';
import { generateUUID, isUUID } from '@shared/domain/utils';

import { InvalidEventCheckInStaffAssignmentException } from '../exceptions/invalid-event-check-in-staff-assignment.exception';

interface CreateEventCheckInStaffAssignmentProps {
  id?: string;
  eventId: string;
  userId: string;
  assignedBy: string;
  assignedAt?: Date;
}

interface EventCheckInStaffAssignmentProps {
  id: string;
  eventId: string;
  userId: string;
  assignedBy: string;
  assignedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  updatedAt: Date;
}

export class EventCheckInStaffAssignmentEntity extends BaseEntity<EventCheckInStaffAssignmentEntity> {
  private readonly _eventId: string;
  private readonly _userId: string;
  private readonly _assignedBy: string;
  private readonly _assignedAt: Date;
  private _revokedAt: Date | null;
  private _revokedBy: string | null;

  private constructor(props: EventCheckInStaffAssignmentProps) {
    super(props.id, props.assignedAt);
    this._eventId = props.eventId;
    this._userId = props.userId;
    this._assignedBy = props.assignedBy;
    this._assignedAt = new Date(props.assignedAt);
    this._revokedAt = props.revokedAt ? new Date(props.revokedAt) : null;
    this._revokedBy = props.revokedBy;
    this._updatedAt = new Date(props.updatedAt);
  }

  get eventId(): string {
    return this._eventId;
  }

  get userId(): string {
    return this._userId;
  }

  get assignedBy(): string {
    return this._assignedBy;
  }

  get assignedAt(): Date {
    return new Date(this._assignedAt);
  }

  get revokedAt(): Date | null {
    return this._revokedAt ? new Date(this._revokedAt) : null;
  }

  get revokedBy(): string | null {
    return this._revokedBy;
  }

  get isActive(): boolean {
    return this._revokedAt === null;
  }

  revoke(
    revokedBy: string,
  ): Result<void, InvalidEventCheckInStaffAssignmentException> {
    if (!isUUID(revokedBy)) {
      return Result.fail(
        InvalidEventCheckInStaffAssignmentException.invalidUUID('revokedBy'),
      );
    }

    if (!this.isActive) {
      return Result.fail(
        InvalidEventCheckInStaffAssignmentException.alreadyRevoked(),
      );
    }

    this._revokedAt = new Date();
    this._revokedBy = revokedBy;
    this.touch();

    return Result.ok(undefined);
  }

  static create(
    props: CreateEventCheckInStaffAssignmentProps,
  ): Result<
    EventCheckInStaffAssignmentEntity,
    InvalidEventCheckInStaffAssignmentException
  > {
    const identifiers = [
      ...(props.id ? [['id', props.id] as const] : []),
      ['eventId', props.eventId],
      ['userId', props.userId],
      ['assignedBy', props.assignedBy],
    ] as const;

    for (const [field, value] of identifiers) {
      if (!isUUID(value)) {
        return Result.fail(
          InvalidEventCheckInStaffAssignmentException.invalidUUID(field),
        );
      }
    }

    const assignedAt = props.assignedAt
      ? new Date(props.assignedAt)
      : new Date();

    return Result.ok(
      new EventCheckInStaffAssignmentEntity({
        id: props.id ?? generateUUID(),
        eventId: props.eventId,
        userId: props.userId,
        assignedBy: props.assignedBy,
        assignedAt,
        revokedAt: null,
        revokedBy: null,
        updatedAt: assignedAt,
      }),
    );
  }

  static reconstitute(
    props: EventCheckInStaffAssignmentProps,
  ): EventCheckInStaffAssignmentEntity {
    return new EventCheckInStaffAssignmentEntity(props);
  }

  clone(): EventCheckInStaffAssignmentEntity {
    return new EventCheckInStaffAssignmentEntity({
      id: this._id,
      eventId: this._eventId,
      userId: this._userId,
      assignedBy: this._assignedBy,
      assignedAt: this._assignedAt,
      revokedAt: this._revokedAt,
      revokedBy: this._revokedBy,
      updatedAt: this._updatedAt,
    });
  }

  validate(): void {
    const identifiers = [
      ['id', this._id],
      ['eventId', this._eventId],
      ['userId', this._userId],
      ['assignedBy', this._assignedBy],
    ] as const;

    for (const [field, value] of identifiers) {
      if (!isUUID(value)) {
        throw InvalidEventCheckInStaffAssignmentException.invalidUUID(field);
      }
    }

    if ((this._revokedAt === null) !== (this._revokedBy === null)) {
      throw new InvalidEventCheckInStaffAssignmentException(
        'Revocation timestamp and actor must be set together',
      );
    }
  }
}