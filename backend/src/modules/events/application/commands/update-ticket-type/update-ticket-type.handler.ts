import { Injectable, Inject, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { SalesPeriodVO } from '../../../domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '../../../domain/value-objects/ticket-price.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import {
  UpdateTicketTypeCommand,
  type UpdateTicketTypeResultCommand,
  type UpdateTicketTypeErrorCommand,
} from './update-ticket-type.command';

// Re-export types for external use
export type UpdateTicketTypeResult = UpdateTicketTypeResultCommand;
export type UpdateTicketTypeError = UpdateTicketTypeErrorCommand;

// ============================================
// Handler
// ============================================

/**
 * Handler for UpdateTicketTypeCommand
 *
 * Follows CQRS pattern - handles updating ticket types.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Validate ticket type exists
 * 4. Validate modifications are allowed (based on sold quantity)
 * 5. Update fields via VOs
 * 6. Save updated event
 * 7. Publish domain events
 */
@Injectable()
export class UpdateTicketTypeHandler {
  private readonly logger = new Logger(UpdateTicketTypeHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly userValidationService: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  /**
   * Execute the update ticket type command
   */
  async execute(
    command: UpdateTicketTypeCommand,
  ): Promise<Result<UpdateTicketTypeResult, UpdateTicketTypeError>> {
    this.logger.debug(
      `Updating ticket type: ${command.ticketTypeId} in event: ${command.eventId}`,
    );

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
        message: 'Only the event organizer can update ticket types',
      });
    }

    // ============================================
    // 4. Find the ticket type
    // ============================================
    const ticketType = event.findTicketType(command.ticketTypeId);
    if (!ticketType) {
      return Result.fail({
        type: 'TICKET_TYPE_NOT_FOUND',
        message: `Ticket type with id '${command.ticketTypeId}' not found`,
      });
    }

    // ============================================
    // 5. Build update props
    // ============================================
    const updateProps: {
      name?: string;
      description?: string | null;
      price?: TicketPriceVO;
      quantity?: number;
    } = {};

    // Name update
    if (command.name !== undefined) {
      updateProps.name = command.name;
    }

    // Description update
    if (command.description !== undefined) {
      updateProps.description = command.description;
    }

    // Price update (requires creating VO)
    if (command.price !== undefined) {
      try {
        const currency = command.currency ?? ticketType.price.currency;
        updateProps.price = TicketPriceVO.create(command.price, currency);
      } catch (error) {
        return Result.fail({
          type: 'INVALID_PRICE',
          message: error instanceof Error ? error.message : 'Invalid price',
        });
      }
    }

    // Quantity update
    if (command.quantity !== undefined) {
      updateProps.quantity = command.quantity;
    }

    // Sales period update (handle separately via direct ticketType method)
    let salesPeriod: SalesPeriodVO | undefined;
    if (command.salesStartDate !== undefined || command.salesEndDate !== undefined) {
      try {
        const startDate = command.salesStartDate ?? ticketType.salesPeriod.startDate;
        const endDate = command.salesEndDate ?? ticketType.salesPeriod.endDate;
        salesPeriod = SalesPeriodVO.create(startDate, endDate);
      } catch (error) {
        return Result.fail({
          type: 'INVALID_SALES_PERIOD',
          message: error instanceof Error ? error.message : 'Invalid sales period',
        });
      }
    }

    // ============================================
    // 6. Update via domain method
    // ============================================
    // First update basic props through event
    if (Object.keys(updateProps).length > 0) {
      const updateResult = event.updateTicketType(command.ticketTypeId, updateProps);

      if (updateResult.isFailure) {
        const error = updateResult.error;
        if (error.message.includes('after sales') || error.message.includes('after first sale')) {
          return Result.fail({
            type: 'CANNOT_MODIFY_AFTER_SALES',
            message: error.message,
          });
        }
        if (error.message.includes('quantity') || error.message.includes('Quantity')) {
          return Result.fail({
            type: 'INVALID_QUANTITY',
            message: error.message,
          });
        }
        return Result.fail({
          type: 'VALIDATION_ERROR',
          message: error.message,
        });
      }
    }

    // Update sales period if provided
    if (salesPeriod) {
      const salesResult = ticketType.updateSalesPeriod(salesPeriod);
      if (salesResult.isFailure) {
        return Result.fail({
          type: 'CANNOT_MODIFY_AFTER_SALES',
          message: salesResult.error.message,
        });
      }
    }

    // Handle isActive separately
    if (command.isActive !== undefined) {
      if (command.isActive) {
        const reactivateResult = ticketType.reactivate();
        if (reactivateResult.isFailure) {
          return Result.fail({
            type: 'VALIDATION_ERROR',
            message: reactivateResult.error.message,
          });
        }
      } else {
        ticketType.deactivate();
      }
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

      this.logger.log(`Ticket type updated successfully: ${command.ticketTypeId}`);

      return Result.okVoid();
    } catch (error) {
      this.logger.error(`Failed to save event: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to update ticket type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
