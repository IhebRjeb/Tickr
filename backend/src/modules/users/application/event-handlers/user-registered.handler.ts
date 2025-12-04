import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { UserRegisteredEvent } from '../../domain/events/user-registered.event';

/**
 * Handler for UserRegisteredEvent
 *
 * This handler is responsible for side effects that occur when a user registers.
 * Following the event-driven architecture, this handler decouples the registration
 * logic from notification and analytics concerns.
 *
 * Current Implementation: Logging only (prepared structure)
 *
 * Future Implementation:
 * - Publishes to notification module for welcome email
 * - Publishes to notification module for email verification link
 * - Logs to analytics module for registration tracking
 * - Updates marketing module for new user onboarding
 */
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredEventHandler
  implements IEventHandler<UserRegisteredEvent>
{
  private readonly logger = new Logger(UserRegisteredEventHandler.name);

  /**
   * Handle the UserRegisteredEvent
   *
   * @param event - The user registered event
   */
  async handle(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(
      `Processing UserRegisteredEvent for user ${event.userId}`,
    );

    // TODO: Publishes to notification module for welcome email
    // await this.notificationService.sendWelcomeEmail({
    //   userId: event.userId,
    //   email: event.email,
    //   firstName: event.firstName,
    // });

    // TODO: Publishes to notification module for email verification
    // await this.notificationService.sendVerificationEmail({
    //   userId: event.userId,
    //   email: event.email,
    //   verificationToken: event.verificationToken,
    // });

    // TODO: Logs to analytics module
    // await this.analyticsService.trackUserRegistration({
    //   userId: event.userId,
    //   email: event.email,
    //   registeredAt: event.registeredAt,
    // });

    this.logger.log(
      `UserRegisteredEvent processed for user ${event.userId} (${event.email})`,
    );
  }
}
