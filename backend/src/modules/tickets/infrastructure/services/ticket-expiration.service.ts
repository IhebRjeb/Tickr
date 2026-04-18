import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';

import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { EVENT_QUERY_PORT } from '../../application/ports/event-query.port';
import type { EventQueryPort } from '../../application/ports/event-query.port';
import { TICKET_REPOSITORY } from '../../application/ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../application/ports/ticket.repository.port';

/**
 * Ticket Expiration Service (Scheduled Job)
 *
 * Finds all tickets with status RESERVED and reserved_until < NOW(),
 * expires them, releases ticket type availability, and publishes domain events.
 *
 * Runs every minute via NestJS @Cron().
 *
 * Design Decisions:
 * - Individual ticket failures don't stop the batch
 * - Releases ticket type availability back to the Events module via port
 * - Comprehensive logging for monitoring
 * - Configurable via environment variables
 * - Can be manually triggered for testing
 */
@Injectable()
export class TicketExpirationService {
  private readonly logger = new Logger(TicketExpirationService.name);
  private readonly isEnabled: boolean;

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQueryPort: EventQueryPort,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisherPort,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<boolean>(
      'scheduler.tickets.enabled',
      true,
    );

    if (!this.isEnabled) {
      this.logger.warn('Ticket expiration scheduler is DISABLED via configuration');
    } else {
      this.logger.log('Ticket expiration scheduler initialized');
    }
  }

  // ============================================
  // Scheduled Job
  // ============================================

  /**
   * Expire reserved tickets that have passed their hold time
   *
   * Runs every minute to ensure tickets are expired promptly
   * after the 15-minute reservation window.
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'expire-reserved-tickets',
    timeZone: 'UTC',
  })
  async expireReservations(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.debug('Starting scheduled job: Expire reserved tickets');
    const startTime = Date.now();

    try {
      const result = await this.processExpiredReservations();
      const duration = Date.now() - startTime;

      if (result.processed > 0) {
        this.logger.log(
          `Expired tickets job completed in ${duration}ms: ` +
            `${result.processed} processed, ` +
            `${result.succeeded} succeeded, ` +
            `${result.failed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Scheduled job failed: expireReservations',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  // ============================================
  // Processing Methods
  // ============================================

  /**
   * Process all expired reservations
   *
   * Can be called manually for testing.
   */
  async processExpiredReservations(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ ticketId: string; error: string }>;
  }> {
    const expiredTickets =
      await this.ticketRepository.findExpiredReservations();

    if (expiredTickets.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.logger.debug(`Found ${expiredTickets.length} expired reservations`);

    const errors: Array<{ ticketId: string; error: string }> = [];
    let succeeded = 0;

    for (const ticket of expiredTickets) {
      try {
        const result = ticket.expire();

        if (result.isSuccess) {
          await this.ticketRepository.save(ticket);
          await this.eventPublisher.publishFromAggregate(ticket);

          // Release the reserved quantity back to the event's ticket type
          await this.eventQueryPort.incrementTicketTypeAvailability(
            ticket.ticketTypeId,
            1,
          );

          succeeded++;
          this.logger.debug(`Expired ticket: ${ticket.id}`);
        } else {
          const errorMsg = result.error?.message ?? 'Unknown error';
          errors.push({ ticketId: ticket.id, error: errorMsg });
          this.logger.warn(`Failed to expire ticket ${ticket.id}: ${errorMsg}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({ ticketId: ticket.id, error: errorMessage });
        this.logger.error(
          `Exception while expiring ticket ${ticket.id}: ${errorMessage}`,
        );
      }
    }

    return {
      processed: expiredTickets.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  // ============================================
  // Manual Trigger
  // ============================================

  /**
   * Manually trigger the expiration job (bypasses enabled check)
   */
  async triggerExpireReservations(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ ticketId: string; error: string }>;
  }> {
    this.logger.log('Manually triggered: Expire reserved tickets');
    return this.processExpiredReservations();
  }
}
