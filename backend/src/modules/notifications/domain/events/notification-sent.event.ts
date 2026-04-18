import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a notification is successfully sent to the provider
 */
export class NotificationSentEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: string,
    public readonly messageId: string,
    public readonly sentAt: Date,
  ) {
    super();
  }

  protected getData(): Record<string, unknown> {
    return {
      notificationId: this.notificationId,
      userId: this.userId,
      channel: this.channel,
      messageId: this.messageId,
      sentAt: this.sentAt.toISOString(),
    };
  }
}
