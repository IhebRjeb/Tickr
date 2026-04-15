import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DuplicateCheckInAttemptedEvent } from '../../domain/events/duplicate-check-in-attempted.event';

/**
 * Infrastructure handler for DuplicateCheckInAttemptedEvent
 *
 * Performs infrastructure side effects for security monitoring:
 * 1. Log security alert with full context
 *
 * Future:
 * - Alert organizer/security staff via Notifications module
 * - Track fraud metrics via Analytics module
 * - Flag suspicious patterns for security review
 */
@Injectable()
export class DuplicateCheckInInfraHandler {
  private readonly logger = new Logger(DuplicateCheckInInfraHandler.name);

  @OnEvent('DuplicateCheckInAttemptedEvent')
  async handle(event: DuplicateCheckInAttemptedEvent): Promise<void> {
    this.logger.warn(
      `[SECURITY] Duplicate check-in infrastructure alert: ` +
        `ticketId=${event.ticketId}, eventId=${event.eventId}, ` +
        `staffId=${event.staffId}, ` +
        `originalCheckedInAt=${event.originalCheckedInAt.toISOString()}`,
    );

    // TODO: Send real-time alert to organizer via WebSocket/push notification
    // TODO: Write to security audit log (separate from application logs)
    // TODO: Track fraud metrics in Analytics module
  }
}
