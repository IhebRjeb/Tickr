import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a user updates their notification preferences
 */
export class PreferencesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, { before: boolean; after: boolean }>,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      userId: this.userId,
      changes: this.changes,
    };
  }
}
