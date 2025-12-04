import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { EmailVerifiedEvent } from '../../domain/events/email-verified.event';

/**
 * Handler for EmailVerifiedEvent
 *
 * This handler is responsible for side effects that occur when a user
 * verifies their email address.
 *
 * Current Implementation: Logging only (prepared structure)
 *
 * Future Implementation:
 * - Logs verification event to analytics module
 * - Updates user engagement metrics
 * - Triggers onboarding flow for verified users
 */
@EventsHandler(EmailVerifiedEvent)
export class EmailVerifiedEventHandler
  implements IEventHandler<EmailVerifiedEvent>
{
  private readonly logger = new Logger(EmailVerifiedEventHandler.name);

  /**
   * Handle the EmailVerifiedEvent
   *
   * @param event - The email verified event
   */
  async handle(event: EmailVerifiedEvent): Promise<void> {
    this.logger.log(
      `Processing EmailVerifiedEvent for user ${event.userId}`,
    );

    // TODO: Logs verification event to analytics module
    // await this.analyticsService.trackEmailVerification({
    //   userId: event.userId,
    //   email: event.email,
    //   verifiedAt: event.verifiedAt,
    // });

    // TODO: Update user journey stage
    // await this.userJourneyService.markEmailVerified({
    //   userId: event.userId,
    //   verifiedAt: event.verifiedAt,
    // });

    this.logger.log(
      `EmailVerifiedEvent processed for user ${event.userId} (${event.email})`,
    );
  }
}
