import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a user changes their password
 */
export class PasswordChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changedAt: Date = new Date(),
  ) {
    super();
  }
}
