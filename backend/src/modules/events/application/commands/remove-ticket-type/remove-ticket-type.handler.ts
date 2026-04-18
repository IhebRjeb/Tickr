import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  RemoveTicketTypeCommand,
  type RemoveTicketTypeResultCommand,
  type RemoveTicketTypeErrorCommand,
} from './remove-ticket-type.command';

// Re-export types for external use
export type RemoveTicketTypeResult = RemoveTicketTypeResultCommand;
export type RemoveTicketTypeError = RemoveTicketTypeErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for RemoveTicketTypeCommand
 *
 * Follows CQRS pattern - handles removing ticket types from events.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Validate event status is DRAFT
 * 4. Call event.removeTicketType()
 * 5. Save updated event
 */
@Injectable()
export class RemoveTicketTypeHandler {
  private readonly logger = new Logger(RemoveTicketTypeHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the remove ticket type command
   */
  async execute(
    command: RemoveTicketTypeCommand,
  ): Promise<Result<RemoveTicketTypeResult, RemoveTicketTypeError>> {
    this.logger.debug(
      `Removing ticket type: ${command.ticketTypeId} from event: ${command.eventId}`,
    );

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
        message: 'Only the event organizer can remove ticket types',
      });
    }

    // ============================================
    // 3. Remove via domain method
    // ============================================
    const removeResult = event.removeTicketType(command.ticketTypeId);

    if (removeResult.isFailure) {
      const error = removeResult.error;
      // Map domain exception to appropriate error type
      if (error.message.includes('not found')) {
        return Result.fail({
          type: 'TICKET_TYPE_NOT_FOUND',
          message: error.message,
        });
      }
      if (error.message.includes('published') || error.code === 'EVENT_ALREADY_PUBLISHED') {
        return Result.fail({
          type: 'EVENT_NOT_DRAFT',
          message: 'Cannot remove ticket types from published events',
        });
      }
      if (error.message.includes('sales') || error.message.includes('sold')) {
        return Result.fail({
          type: 'HAS_SALES',
          message: error.message,
        });
      }
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    // ============================================
    // 4. Save to repository
    // ============================================
    try {
      await this.eventRepository.save(event);

      // ============================================
      // 5. Publish domain events (if any)
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(`Ticket type removed successfully: ${command.ticketTypeId}`);

      return Result.okVoid();
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to remove ticket type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
