import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a user verifies their email address
 *
 * This event is published after successful email verification
 * and can be used for analytics and user journey tracking.
 */
export class EmailVerifiedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly verifiedAt: Date = new Date(),
  ) {
    super();
  }
}
