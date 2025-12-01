import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a user updates their profile
 */
export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    },
  ) {
    super();
  }
}
