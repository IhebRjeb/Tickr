import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a notification delivery fails
 */
export class NotificationFailedEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly reason: string,
    public readonly retryCount: number,
    public readonly willRetry: boolean,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      reason: this.reason,
      retryCount: this.retryCount,
      willRetry: this.willRetry,
    };
  }
}
