import { Injectable, Inject, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import type { EventCategory } from '../../../domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '../../../domain/value-objects/event-date-range.vo';
import { LocationVO } from '../../../domain/value-objects/location.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  UpdateEventCommand,
  type UpdateEventResultCommand,
  type UpdateEventErrorCommand,
} from './update-event.command';

// Re-export types for external use
export type UpdateEventResult = UpdateEventResultCommand;
export type UpdateEventError = UpdateEventErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for UpdateEventCommand
 *
 * Follows CQRS pattern - handles event update business logic.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer (ownership check)
 * 3. Validate event can be modified (status check)
 * 4. Update fields via Value Objects
 * 5. Call event.updateDetails()
 * 6. Save updated event
 * 7. Publish domain events
 */
@Injectable()
export class UpdateEventHandler {
  private readonly logger = new Logger(UpdateEventHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the update event command
   */
  async execute(
    command: UpdateEventCommand,
  ): Promise<Result<UpdateEventResult, UpdateEventError>> {
    this.logger.debug(`Updating event: ${command.eventId} by user: ${command.userId}`);

    // ============================================
    // 1. Validate command has changes
    // ============================================
    if (!command.hasChanges()) {
      return Result.fail({
        type: 'NO_CHANGES',
        message: 'No changes provided',
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
        message: 'Only the event organizer can update this event',
      });
    }

    // ============================================
    // 4. Build update props
    // ============================================
    const updateProps: {
      title?: string;
      description?: string | null;
      category?: EventCategory;
      location?: LocationVO;
      dateRange?: EventDateRangeVO;
    } = {};

    // Title
    if (command.title !== undefined) {
      updateProps.title = command.title;
    }

    // Description
    if (command.description !== undefined) {
      updateProps.description = command.description;
    }

    // Category
    if (command.category !== undefined) {
      updateProps.category = command.category;
    }

    // Location (requires creating VO)
    if (command.location !== undefined) {
      try {
        updateProps.location = LocationVO.create({
          address: command.location.address || null,
          city: command.location.city,
          country: command.location.country,
          postalCode: command.location.postalCode || null,
          latitude: command.location.latitude ?? null,
          longitude: command.location.longitude ?? null,
        });
      } catch (error) {
        return Result.fail({
          type: 'INVALID_LOCATION',
          message: error instanceof Error ? error.message : 'Invalid location',
        });
      }
    }

    // Date range (requires creating VO)
    if (command.startDate !== undefined || command.endDate !== undefined) {
      try {
        const startDate = command.startDate ?? event.dateRange.startDate;
        const endDate = command.endDate ?? event.dateRange.endDate;
        // For existing events, we might not require future validation
        // depending on business rules - here we do require it for new dates
        updateProps.dateRange = EventDateRangeVO.create(startDate, endDate, true);
      } catch (error) {
        return Result.fail({
          type: 'INVALID_DATE_RANGE',
          message: error instanceof Error ? error.message : 'Invalid date range',
        });
      }
    }

    // ============================================
    // 5. Update event via domain method
    // ============================================
    const updateResult = event.updateDetails(updateProps);

    if (updateResult.isFailure) {
      const error = updateResult.error;
      // Map domain exception to appropriate error type
      if (error.code === 'EVENT_CANNOT_BE_MODIFIED') {
        return Result.fail({
          type: 'CANNOT_MODIFY',
          message: error.message,
        });
      }
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    // ============================================
    // 6. Save to repository
    // ============================================
    try {
      const savedEvent = await this.eventRepository.save(event);

      // ============================================
      // 7. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(`Event updated successfully: ${savedEvent.id}`);

      return Result.ok({ event: savedEvent.toObject() });
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
