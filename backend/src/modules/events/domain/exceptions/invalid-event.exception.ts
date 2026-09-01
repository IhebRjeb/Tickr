import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when event validation fails
 */
export class InvalidEventException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_EVENT');
  }

  /**
   * Factory method for missing title
   */
  static missingTitle(): InvalidEventException {
    return new InvalidEventException('Event title is required');
  }

  /**
   * Factory method for title too long
   */
  static titleTooLong(maxLength: number): InvalidEventException {
    return new InvalidEventException(`Event title must be at most ${maxLength} characters`);
  }

  /**
   * Factory method for description too long
   */
  static descriptionTooLong(maxLength: number): InvalidEventException {
    return new InvalidEventException(
      `Event description must be at most ${maxLength} characters`,
    );
  }

  /**
   * Factory method for missing organizer
   */
  static missingOrganizer(): InvalidEventException {
    return new InvalidEventException('Event must have an organizer');
  }

  /**
   * Factory method for invalid organizer ID (not a valid UUID)
   */
  static invalidOrganizerId(organizerId: string): InvalidEventException {
    return new InvalidEventException(
      `Invalid organizer ID: "${organizerId}" is not a valid UUID`,
    );
  }

  /**
   * Factory method for invalid category
   */
  static invalidCategory(category: string): InvalidEventException {
    return new InvalidEventException(`Invalid event category: ${category}`);
  }

  static invalidCommissionRate(rate: number): InvalidEventException {
    return new InvalidEventException(
      `Event commission rate must be between 0 and 0.2, received ${rate}`,
    );
  }

  /**
   * Factory method for cannot modify after published
   */
  static cannotModifyPublished(): InvalidEventException {
    return new InvalidEventException('Cannot modify event details after it has been published');
  }

  /**
   * Factory method for insufficient tickets
   */
  static insufficientTickets(available: number, requested: number): InvalidEventException {
    return new InvalidEventException(
      `Insufficient tickets: ${available} available, ${requested} requested`,
    );
  }

  /**
   * Factory method for event not found
   */
  static notFound(eventId: string): InvalidEventException {
    return new InvalidEventException(`Event not found: ${eventId}`);
  }

  /**
   * Factory method for ticket type not found
   */
  static ticketTypeNotFound(ticketTypeId: string): InvalidEventException {
    return new InvalidEventException(`Ticket type not found: ${ticketTypeId}`);
  }
}
