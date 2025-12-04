import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { PasswordResetRequestedEvent } from '../../domain/events/password-reset-requested.event';

/**
 * Handler for PasswordResetRequestedEvent
 *
 * This handler is responsible for side effects that occur when a user
 * requests a password reset.
 *
 * Current Implementation: Logging only (prepared structure)
 *
 * Future Implementation:
 * - Publishes to notification module for password reset email
 * - Logs security event to audit module
 * - Updates security metrics in analytics
 */
@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedEventHandler
  implements IEventHandler<PasswordResetRequestedEvent>
{
  private readonly logger = new Logger(PasswordResetRequestedEventHandler.name);

  /**
   * Handle the PasswordResetRequestedEvent
   *
   * @param event - The password reset requested event
   */
  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(
      `Processing PasswordResetRequestedEvent for user ${event.userId}`,
    );

    // TODO: Publishes to notification module for reset email
    // await this.notificationService.sendPasswordResetEmail({
    //   userId: event.userId,
    //   email: event.email,
    //   resetToken: event.resetToken,
    //   expiresAt: event.expiresAt,
    // });

    // TODO: Log security event
    // await this.auditService.logSecurityEvent({
    //   type: 'PASSWORD_RESET_REQUESTED',
    //   userId: event.userId,
    //   email: event.email,
    //   requestedAt: event.requestedAt,
    // });

    this.logger.log(
      `PasswordResetRequestedEvent processed for user ${event.userId} - reset email will be sent to ${event.email}`,
    );
  }
}
