import { Injectable, Inject, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  CancelEventCommand,
  type CancelEventResultCommand,
  type CancelEventErrorCommand,
} from './cancel-event.command';

// Re-export types for external use
export type CancelEventResult = CancelEventResultCommand;
export type CancelEventError = CancelEventErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for CancelEventCommand
 *
 * Follows CQRS pattern - handles event cancellation.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Validate cancellation is allowed
 * 4. Call event.cancel(reason)
 * 5. Save updated event
 * 6. Publish EventCancelledEvent (triggers refunds for published events)
 */
@Injectable()
export class CancelEventHandler {
  private readonly logger = new Logger(CancelEventHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the cancel event command
   */
  async execute(
    command: CancelEventCommand,
  ): Promise<Result<CancelEventResult, CancelEventError>> {
    this.logger.debug(`Cancelling event: ${command.eventId} by user: ${command.userId}`);

    // ============================================
    // 1. Validate reason is provided
    // ============================================
    if (!command.reason || command.reason.trim().length === 0) {
      return Result.fail({
        type: 'MISSING_REASON',
        message: 'Cancellation reason is required',
      });
    }

    // ============================================
    // 2. Find the event
    // ============================================
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    // ============================================
    // 3. Validate ownership
    // ============================================
    if (!this.userValidationService.isEventOwner(command.userId, event.organizerId)) {
      return Result.fail({
        type: 'NOT_OWNER',
        message: 'Only the event organizer can cancel this event',
      });
    }

    // ============================================
    // 4. Cancel via domain method
    // ============================================
    const cancelResult = event.cancel(command.reason);

    if (cancelResult.isFailure) {
      const error = cancelResult.error;
      // Map domain exception to appropriate error type based on code
      switch (error.code) {
        case 'EVENT_ALREADY_CANCELLED':
          return Result.fail({
            type: 'ALREADY_CANCELLED',
            message: error.message,
          });
        case 'EVENT_ALREADY_COMPLETED':
          return Result.fail({
            type: 'ALREADY_COMPLETED',
            message: error.message,
          });
        case 'EVENT_ALREADY_STARTED':
          return Result.fail({
            type: 'ALREADY_STARTED',
            message: error.message,
          });
        case 'WRONG_STATUS':
          return Result.fail({
            type: 'WRONG_STATUS',
            message: error.message,
          });
        default:
          return Result.fail({
            type: 'VALIDATION_ERROR',
            message: error.message,
          });
      }
    }

    // ============================================
    // 5. Save to repository
    // ============================================
    try {
      await this.eventRepository.save(event);

      // ============================================
      // 6. Publish domain events
      // The EventCancelledEvent will trigger refund
      // processing for any sold tickets
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(`Event cancelled successfully: ${event.id}, reason: ${command.reason}`);

      return Result.okVoid();
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to cancel event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
