import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Event emitted when a user requests a password reset
 *
 * This event is published after a password reset request
 * and is used by the notification module to send reset emails.
 */
export class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly resetToken: string,
    public readonly expiresAt: Date,
    public readonly requestedAt: Date = new Date(),
  ) {
    super();
  }
}
