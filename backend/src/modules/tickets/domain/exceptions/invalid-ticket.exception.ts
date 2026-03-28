import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when ticket validation fails during creation
 */
export class InvalidTicketException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_TICKET');
  }

  static missingHolderName(): InvalidTicketException {
    return new InvalidTicketException('Ticket holder name is required');
  }

  static holderNameTooLong(maxLength: number): InvalidTicketException {
    return new InvalidTicketException(
      `Ticket holder name must be at most ${maxLength} characters`,
    );
  }

  static missingHolderEmail(): InvalidTicketException {
    return new InvalidTicketException('Ticket holder email is required');
  }

  static invalidUUID(fieldName: string): InvalidTicketException {
    return new InvalidTicketException(
      `${fieldName} must be a valid UUID`,
    );
  }

  static missingEventId(): InvalidTicketException {
    return new InvalidTicketException('Event ID is required');
  }

  static missingTicketTypeId(): InvalidTicketException {
    return new InvalidTicketException('Ticket type ID is required');
  }

  static missingUserId(): InvalidTicketException {
    return new InvalidTicketException('User ID is required');
  }

  static missingReservedUntil(): InvalidTicketException {
    return new InvalidTicketException('Reservation expiry time is required');
  }

  static invalidPrice(): InvalidTicketException {
    return new InvalidTicketException('Ticket price must be non-negative');
  }
}
