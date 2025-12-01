import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a user account is deactivated
 */
export class UserDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly deactivatedAt: Date = new Date(),
  ) {
    super();
  }
}
