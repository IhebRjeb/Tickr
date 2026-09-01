import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when check-in entity validation fails
 */
export class InvalidCheckInException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_CHECK_IN');
  }

  static missingTicketId(): InvalidCheckInException {
    return new InvalidCheckInException('Check-in ticket ID is required');
  }

  static missingEventId(): InvalidCheckInException {
    return new InvalidCheckInException('Check-in event ID is required');
  }

  static missingStaffId(): InvalidCheckInException {
    return new InvalidCheckInException('Check-in staff ID is required');
  }

  static missingDeviceId(): InvalidCheckInException {
    return new InvalidCheckInException('Check-in device ID is required');
  }

  static missingLocationGate(): InvalidCheckInException {
    return new InvalidCheckInException('Check-in location gate is required');
  }

  static missingAssignmentForAuthorization(): InvalidCheckInException {
    return new InvalidCheckInException(
      'Assignment authorization requires an assignment ID',
    );
  }

  static invalidUUID(fieldName: string): InvalidCheckInException {
    return new InvalidCheckInException(
      `${fieldName} must be a valid UUID`,
    );
  }
}
