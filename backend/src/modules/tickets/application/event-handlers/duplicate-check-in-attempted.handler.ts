import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { DuplicateCheckInAttemptedEvent } from '../../domain/events/duplicate-check-in-attempted.event';

/**
 * Event Handler: DuplicateCheckInAttempted
 *
 * Handles the DuplicateCheckInAttemptedEvent domain event for security monitoring.
 * Triggered when someone attempts to check in a ticket that has already been used.
 * This is a potential fraud indicator and should be logged and alerted.
 *
 * Cross-Module Integrations (prepared for future):
 * - Notifications Module: Alert organizer/security staff
 * - Analytics Module: Track fraud metrics
 * - Security Module: Flag suspicious patterns
 *
 * @implements {IEventHandler<DuplicateCheckInAttemptedEvent>}
 */
@Injectable()
@EventsHandler(DuplicateCheckInAttemptedEvent)
export class DuplicateCheckInAttemptedEventHandler
  implements IEventHandler<DuplicateCheckInAttemptedEvent>
{
  private readonly logger = new Logger(
    DuplicateCheckInAttemptedEventHandler.name,
  );

  async handle(event: DuplicateCheckInAttemptedEvent): Promise<void> {
    this.logger.warn(
      `SECURITY: Duplicate check-in attempted for ticket ${event.ticketId} ` +
        `at event ${event.eventId}`,
    );
    this.logger.warn(
      `Duplicate check-in details: staffId=${event.staffId}, ` +
        `originalCheckedInAt=${event.originalCheckedInAt.toISOString()}`,
    );

    // ============================================
    // TODO: Notifications Module Integration
    // ============================================
    // Alert organizer/security staff about duplicate check-in
    //
    // await this.notificationService.sendSecurityAlert({
    //   type: 'DUPLICATE_CHECK_IN',
    //   ticketId: event.ticketId,
    //   eventId: event.eventId,
    //   staffId: event.staffId,
    //   originalCheckedInAt: event.originalCheckedInAt,
    //   attemptedAt: new Date(),
    // });

    // ============================================
    // TODO: Analytics Module Integration
    // ============================================
    // Track fraud/security metrics
    //
    // await this.analyticsService.trackSecurityIncident({
    //   type: 'DUPLICATE_CHECK_IN',
    //   ticketId: event.ticketId,
    //   eventId: event.eventId,
    //   staffId: event.staffId,
    //   originalCheckedInAt: event.originalCheckedInAt,
    // });

    this.logger.log(
      `Successfully processed DuplicateCheckInAttempted for ticket ${event.ticketId}`,
    );
  }
}
