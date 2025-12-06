import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a new user registers
 *
 * This event is published after successful user registration
 * and is used by other modules to trigger welcome workflows.
 */
export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly verificationToken: string,
    public readonly registeredAt: Date = new Date(),
  ) {
    super();
  }
}
