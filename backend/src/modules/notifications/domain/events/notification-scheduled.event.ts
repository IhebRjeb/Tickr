import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a notification is scheduled for sending
 */
export class NotificationScheduledEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly channel: string,
    public readonly priority: string,
    public readonly scheduledFor: Date | null,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      userId: this.userId,
      type: this.type,
      channel: this.channel,
      priority: this.priority,
      scheduledFor: this.scheduledFor?.toISOString() ?? null,
    };
  }
}
