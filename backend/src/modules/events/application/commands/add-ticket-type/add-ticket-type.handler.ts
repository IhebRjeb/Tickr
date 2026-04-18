import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { TicketTypeEntity } from '../../../domain/entities/ticket-type.entity';
import { SalesPeriodVO } from '../../../domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '../../../domain/value-objects/ticket-price.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  AddTicketTypeCommand,
  type AddTicketTypeResultCommand,
  type AddTicketTypeErrorCommand,
} from './add-ticket-type.command';

// Re-export types for external use
export type AddTicketTypeResult = AddTicketTypeResultCommand;
export type AddTicketTypeError = AddTicketTypeErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for AddTicketTypeCommand
 *
 * Follows CQRS pattern - handles adding ticket types to events.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Create TicketType entity with VOs
 * 4. Call event.addTicketType()
 * 5. Save updated event
 * 6. Publish domain events
 */
@Injectable()
export class AddTicketTypeHandler {
  private readonly logger = new Logger(AddTicketTypeHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the add ticket type command
   */
  async execute(
    command: AddTicketTypeCommand,
  ): Promise<Result<AddTicketTypeResult, AddTicketTypeError>> {
    this.logger.debug(
      `Adding ticket type to event: ${command.eventId} by user: ${command.userId}`,
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
        message: 'Only the event organizer can add ticket types',
      });
    }

    // ============================================
    // 3. Create Price Value Object
    // ============================================
    let price: TicketPriceVO;
    try {
      price = TicketPriceVO.create(command.price, command.currency);
    } catch (error) {
      return Result.fail({
        type: 'INVALID_PRICE',
        message: error instanceof Error ? error.message : 'Invalid price',
      });
    }

    // ============================================
    // 4. Create Sales Period Value Object
    // ============================================
    let salesPeriod: SalesPeriodVO;
    try {
      salesPeriod = SalesPeriodVO.create(command.salesStartDate, command.salesEndDate);
    } catch (error) {
      return Result.fail({
        type: 'INVALID_SALES_PERIOD',
        message: error instanceof Error ? error.message : 'Invalid sales period',
      });
    }

    // ============================================
    // 5. Create TicketType entity
    // ============================================
    const ticketTypeResult = TicketTypeEntity.create({
      eventId: command.eventId,
      name: command.name,
      description: command.description,
      price,
      quantity: command.quantity,
      salesPeriod,
      isActive: command.isActive ?? true,
    });

    if (ticketTypeResult.isFailure) {
      return Result.fail({
        type: 'INVALID_TICKET_TYPE',
        message: ticketTypeResult.error.message,
      });
    }

    const ticketType = ticketTypeResult.value;

    // ============================================
    // 6. Add to event via domain method
    // ============================================
    const addResult = event.addTicketType(ticketType);

    if (addResult.isFailure) {
      const error = addResult.error;
      // Map domain exception to appropriate error type
      if (error.code === 'MAX_TICKET_TYPES_REACHED') {
        return Result.fail({
          type: 'MAX_TICKET_TYPES_REACHED',
          message: error.message,
        });
      }
      if (error.code === 'DUPLICATE_TICKET_TYPE_NAME') {
        return Result.fail({
          type: 'DUPLICATE_NAME',
          message: error.message,
        });
      }
      if (error.code === 'INVALID_SALES_PERIOD') {
        return Result.fail({
          type: 'INVALID_SALES_PERIOD',
          message: error.message,
        });
      }
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
    // 7. Save to repository
    // ============================================
    try {
      await this.eventRepository.save(event);

      // ============================================
      // 8. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(event);

      this.logger.log(
        `Ticket type added successfully: ${ticketType.id} to event: ${event.id}`,
      );

      return Result.ok({ ticketTypeId: ticketType.id });
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to add ticket type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
