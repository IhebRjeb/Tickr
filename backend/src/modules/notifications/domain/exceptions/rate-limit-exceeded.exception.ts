import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when user or system rate limit is exceeded
 */
export class RateLimitExceededException extends DomainException {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED');
  }

  static userLimit(
    userId: string,
    limit: number,
  ): RateLimitExceededException {
    return new RateLimitExceededException(
      `User ${userId} has exceeded the rate limit of ${limit} notifications per hour`,
    );
  }

  static systemEmailLimit(
    limit: number,
  ): RateLimitExceededException {
    return new RateLimitExceededException(
      `System email rate limit of ${limit} per second exceeded`,
    );
  }

  static systemSmsLimit(
    limit: number,
  ): RateLimitExceededException {
    return new RateLimitExceededException(
      `System SMS rate limit of ${limit} per minute exceeded`,
    );
  }
}
