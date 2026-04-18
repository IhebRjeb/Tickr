import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { EventEntity } from '../../../domain/entities/event.entity';
import { EventDateRangeVO } from '../../../domain/value-objects/event-date-range.vo';
import { LocationVO } from '../../../domain/value-objects/location.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  CreateEventCommand,
  type CreateEventResultCommand,
  type CreateEventErrorCommand,
} from './create-event.command';

// Re-export types for external use
export type CreateEventResult = CreateEventResultCommand;
export type CreateEventError = CreateEventErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for CreateEventCommand
 *
 * Follows CQRS pattern - handles event creation business logic.
 *
 * Responsibilities:
 * 1. Validate user exists and has ORGANIZER role
 * 2. Create Location VO
 * 3. Create DateRange VO
 * 4. Create Event aggregate via factory
 * 5. Save to repository
 * 6. Publish domain events
 */
@Injectable()
export class CreateEventHandler {
  private readonly logger = new Logger(CreateEventHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the create event command
   */
  async execute(
    command: CreateEventCommand,
  ): Promise<Result<CreateEventResult, CreateEventError>> {
    this.logger.debug(`Creating event for organizer: ${command.organizerId}`);

    // ============================================
    // 1. Validate user exists and has ORGANIZER role
    // ============================================
    const userValidation = await this.userValidationService.validateOrganizer(
      command.organizerId,
    );

    if (!userValidation.exists) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.organizerId}' not found`,
      });
    }

    if (!userValidation.isOrganizer) {
      return Result.fail({
        type: 'NOT_ORGANIZER',
        message: `User '${command.organizerId}' does not have ORGANIZER role`,
      });
    }

    // ============================================
    // 2. Create Location Value Object
    // ============================================
    let location: LocationVO;
    try {
      location = LocationVO.create({
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

    // ============================================
    // 3. Create DateRange Value Object
    // ============================================
    let dateRange: EventDateRangeVO;
    try {
      dateRange = EventDateRangeVO.create(
        command.startDate,
        command.endDate,
        true, // validateFuture = true for new events
      );
    } catch (error) {
      return Result.fail({
        type: 'INVALID_DATE_RANGE',
        message: error instanceof Error ? error.message : 'Invalid date range',
      });
    }

    // ============================================
    // 4. Create Event aggregate via factory
    // ============================================
    const eventResult = EventEntity.create({
      organizerId: command.organizerId,
      title: command.title,
      description: command.description,
      category: command.category,
      location,
      dateRange,
      imageUrl: command.imageUrl,
    });

    if (eventResult.isFailure) {
      const error = eventResult.error;
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    const event = eventResult.value;

    // ============================================
    // 5. Save to repository
    // ============================================
    try {
      const savedEvent = await this.eventRepository.save(event);

      // ============================================
      // 6. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(`Event created successfully: ${savedEvent.id}`);

      return Result.ok({ eventId: savedEvent.id });
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
