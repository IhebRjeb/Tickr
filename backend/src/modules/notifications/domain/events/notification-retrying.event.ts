import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a failed notification is scheduled for retry
 */
export class NotificationRetryingEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly retryCount: number,
    public readonly nextRetryAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      retryCount: this.retryCount,
      nextRetryAt: this.nextRetryAt.toISOString(),
    };
  }
}
