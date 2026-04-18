import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a notification channel is disabled or unavailable
 */
export class ChannelUnavailableException extends DomainException {
  constructor(message: string) {
    super(message, 'CHANNEL_UNAVAILABLE');
  }

  static notSupported(channel: string): ChannelUnavailableException {
    return new ChannelUnavailableException(
      `Notification channel ${channel} is not currently supported`,
    );
  }

  static disabledForUser(
    userId: string,
    channel: string,
  ): ChannelUnavailableException {
    return new ChannelUnavailableException(
      `Channel ${channel} is disabled for user ${userId}`,
    );
  }
}
