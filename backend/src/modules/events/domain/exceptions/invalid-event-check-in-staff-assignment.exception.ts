import { DomainException } from '@shared/domain/domain-exception.base';

export class InvalidEventCheckInStaffAssignmentException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_EVENT_CHECK_IN_STAFF_ASSIGNMENT');
  }

  static invalidUUID(field: string): InvalidEventCheckInStaffAssignmentException {
    return new InvalidEventCheckInStaffAssignmentException(
      `${field} must be a valid UUID`,
    );
  }

  static alreadyRevoked(): InvalidEventCheckInStaffAssignmentException {
    return new InvalidEventCheckInStaffAssignmentException(
      'Check-in staff assignment is already revoked',
    );
  }
}