import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when someone attempts to check in an already checked-in ticket (fraud detection)
 */
export class DuplicateCheckInAttemptedEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly staffId: string,
    public readonly originalCheckedInAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      ticketId: this.ticketId,
      eventId: this.eventId,
      staffId: this.staffId,
      originalCheckedInAt: this.originalCheckedInAt.toISOString(),
    };
  }
}
