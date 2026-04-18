import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  PublishEventCommand,
  type PublishEventResultCommand,
  type PublishEventErrorCommand,
} from './publish-event.command';

// Re-export types for external use
export type PublishEventResult = PublishEventResultCommand;
export type PublishEventError = PublishEventErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for PublishEventCommand
 *
 * Follows CQRS pattern - handles publishing events.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Call event.publish() which validates all requirements
 * 4. Save updated event
 * 5. Publish EventPublishedEvent domain event
 */
@Injectable()
export class PublishEventHandler {
  private readonly logger = new Logger(PublishEventHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the publish event command
   */
  async execute(
    command: PublishEventCommand,
  ): Promise<Result<PublishEventResult, PublishEventError>> {
    this.logger.debug(`Publishing event: ${command.eventId} by user: ${command.userId}`);

    // ============================================
    // 1. Find the event
    // ============================================
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    // ============================================
    // 2. Validate ownership
    // ============================================
    if (!this.userValidationService.isEventOwner(command.userId, event.organizerId)) {
      return Result.fail({
        type: 'NOT_OWNER',
        message: 'Only the event organizer can publish this event',
      });
    }

    // ============================================
    // 3. Publish via domain method
    // ============================================
    const publishResult = event.publish();

    if (publishResult.isFailure) {
      const error = publishResult.error;
      // Map domain exception to appropriate error type based on code
      switch (error.code) {
        case 'WRONG_STATUS':
          return Result.fail({
            type: 'WRONG_STATUS',
            message: error.message,
          });
        case 'MISSING_TITLE':
          return Result.fail({
            type: 'MISSING_TITLE',
            message: error.message,
          });
        case 'MISSING_LOCATION':
          return Result.fail({
            type: 'MISSING_LOCATION',
            message: error.message,
          });
        case 'MISSING_TICKET_TYPES':
          return Result.fail({
            type: 'MISSING_TICKET_TYPES',
            message: error.message,
          });
        case 'EVENT_DATE_IN_PAST':
          return Result.fail({
            type: 'EVENT_DATE_IN_PAST',
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
    // 4. Save to repository
    // ============================================
    try {
      await this.eventRepository.save(event);

      // ============================================
      // 5. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(`Event published successfully: ${event.id}`);

      return Result.okVoid();
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to publish event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
