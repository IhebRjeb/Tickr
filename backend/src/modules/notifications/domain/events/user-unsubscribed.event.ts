import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a user unsubscribes from a notification category
 */
export class UserUnsubscribedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly category: string,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      userId: this.userId,
      category: this.category,
    };
  }
}
