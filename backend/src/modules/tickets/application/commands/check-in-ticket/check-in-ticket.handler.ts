import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { CheckInEntity } from '../../../domain/entities/check-in.entity';
import { QRCodeVO } from '../../../domain/value-objects/qr-code.vo';
import { CHECK_IN_REPOSITORY } from '../../ports/check-in.repository.port';
import type { CheckInRepositoryPort } from '../../ports/check-in.repository.port';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';

import {
  CheckInTicketCommand,
  type CheckInTicketErrorCommand,
  type CheckInTicketResultCommand,
} from './check-in-ticket.command';

// Re-export types for external use
export type CheckInTicketResult = CheckInTicketResultCommand;
export type CheckInTicketError = CheckInTicketErrorCommand;

const CHECK_IN_WINDOW_HOURS_BEFORE = 1;

/**
 * Handler for CheckInTicketCommand
 *
 * Validates QR code, checks time window, and processes check-in.
 *
 * Responsibilities:
 * 1. Validate QR code format
 * 2. Find ticket by QR code
 * 3. Validate check-in time window (start − 1h → end)
 * 4. Execute check-in on the ticket aggregate
 * 5. Create check-in audit record
 * 6. Save ticket + check-in
 * 7. Publish domain events
 */
@Injectable()
export class CheckInTicketHandler {
  private readonly logger = new Logger(CheckInTicketHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(CHECK_IN_REPOSITORY)
    private readonly checkInRepository: CheckInRepositoryPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: CheckInTicketCommand,
  ): Promise<Result<CheckInTicketResult, CheckInTicketError>> {
    this.logger.debug(
      `Check-in attempt: QR=${command.qrCode}, staff=${command.staffId}`,
    );

    // ============================================
    // 1. Validate QR code format
    // ============================================
    try {
      QRCodeVO.fromString(command.qrCode);
    } catch {
      return Result.fail({
        type: 'INVALID_QR_CODE',
        message: 'Invalid QR code format or checksum',
      });
    }

    // ============================================
    // 2. Find ticket by QR code
    // ============================================
    const ticket = await this.ticketRepository.findByQRCode(command.qrCode);
    if (!ticket) {
      return Result.fail({
        type: 'TICKET_NOT_FOUND',
        message: `No ticket found for QR code`,
      });
    }

    // ============================================
    // 3. Validate check-in time window
    // ============================================
    const event = await this.eventQuery.getEventById(ticket.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event '${ticket.eventId}' not found`,
      });
    }

    const now = new Date();
    const windowOpens = new Date(
      event.startDate.getTime() -
        CHECK_IN_WINDOW_HOURS_BEFORE * 60 * 60 * 1000,
    );

    if (now < windowOpens) {
      return Result.fail({
        type: 'CHECK_IN_OUTSIDE_WINDOW',
        message: `Check-in opens at ${windowOpens.toISOString()}, ${CHECK_IN_WINDOW_HOURS_BEFORE} hour(s) before event start`,
      });
    }

    if (now > event.endDate) {
      return Result.fail({
        type: 'CHECK_IN_OUTSIDE_WINDOW',
        message: `Check-in closed: event ended at ${event.endDate.toISOString()}`,
      });
    }

    // ============================================
    // 4. Execute check-in on aggregate
    // ============================================
    const checkInResult = ticket.checkIn(
      command.staffId,
      command.locationGate,
      ticket.holderName,
      'General Admission', // Ticket type name resolved in query layer
    );

    // ============================================
    // 5. Create check-in audit record
    // ============================================
    const isValid = checkInResult.isSuccess;
    const checkInEntityResult = CheckInEntity.create({
      ticketId: ticket.id,
      eventId: ticket.eventId,
      staffId: command.staffId,
      deviceId: command.deviceId,
      locationGate: command.locationGate,
      isValid,
      failureReason: isValid ? undefined : checkInResult.error.message,
    });

    if (checkInEntityResult.isFailure) {
      return Result.fail({
        type: 'CHECK_IN_FAILED',
        message: checkInEntityResult.error.message,
      });
    }

    // ============================================
    // 6. Save ticket + check-in
    // ============================================
    try {
      await this.ticketRepository.save(ticket);
      await this.checkInRepository.save(checkInEntityResult.value);

      // ============================================
      // 7. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(ticket);

      if (isValid) {
        this.logger.log(
          `Ticket ${ticket.id} checked in at ${command.locationGate}`,
        );
        return Result.ok(checkInResult.value);
      }

      // Duplicate check-in: save audit trail but return failure
      this.logger.warn(
        `Duplicate check-in attempt for ticket ${ticket.id}`,
      );
      return Result.fail({
        type: 'CHECK_IN_FAILED',
        message: checkInResult.error.message,
      });
    } catch (error) {
      this.logger.error(`Failed to save check-in: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to process check-in: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
