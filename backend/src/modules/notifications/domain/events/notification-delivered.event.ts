import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a notification delivery is confirmed
 */
export class NotificationDeliveredEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly deliveredAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      deliveredAt: this.deliveredAt.toISOString(),
    };
  }
}
