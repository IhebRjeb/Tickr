import { Inject, Injectable, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { CheckInEntity } from '../../../domain/entities/check-in.entity';
import { QRCodeVO } from '../../../domain/value-objects/qr-code.vo';
import { CHECK_IN_REPOSITORY } from '../../ports/check-in.repository.port';
import type { CheckInRepositoryPort } from '../../ports/check-in.repository.port';
import { EVENT_CHECK_IN_ACCESS_PORT } from '../../ports/event-check-in-access.port';
import type { EventCheckInAccessPort } from '../../ports/event-check-in-access.port';
import { EVENT_QUERY_PORT } from '../../ports/event-query.port';
import type { EventQueryPort } from '../../ports/event-query.port';
import { TICKET_CHECK_IN_PERSISTENCE_PORT } from '../../ports/ticket-check-in-persistence.port';
import type { TicketCheckInPersistencePort } from '../../ports/ticket-check-in-persistence.port';
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
    @Inject(EVENT_CHECK_IN_ACCESS_PORT)
    private readonly eventCheckInAccess: EventCheckInAccessPort,
    @Inject(EVENT_QUERY_PORT)
    private readonly eventQuery: EventQueryPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
    @Inject(TICKET_CHECK_IN_PERSISTENCE_PORT)
    private readonly ticketCheckInPersistence: TicketCheckInPersistencePort,
  ) {}

  async execute(
    command: CheckInTicketCommand,
  ): Promise<Result<CheckInTicketResult, CheckInTicketError>> {
    this.logger.debug(
      `Check-in attempt for event ${command.eventId} by staff ${command.staffId}`,
    );

    const access = await this.eventCheckInAccess.resolve(
      command.eventId,
      command.staffId,
    );
    if (!access?.canCheckIn) {
      return Result.fail({
        type: 'CHECK_IN_FORBIDDEN',
        message: 'Check-in access denied',
      });
    }

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
    if (!ticket || ticket.eventId !== command.eventId) {
      return Result.fail({
        type: 'TICKET_NOT_FOUND',
        message: 'No ticket found for this event',
      });
    }

    // ============================================
    // 3. Validate check-in time window
    // ============================================
    const now = new Date();
    const windowOpens = new Date(
      access.startDate.getTime() -
        CHECK_IN_WINDOW_HOURS_BEFORE * 60 * 60 * 1000,
    );

    if (now < windowOpens) {
      return Result.fail({
        type: 'CHECK_IN_OUTSIDE_WINDOW',
        message: `Check-in opens at ${windowOpens.toISOString()}, ${CHECK_IN_WINDOW_HOURS_BEFORE} hour(s) before event start`,
      });
    }

    if (now > access.endDate) {
      return Result.fail({
        type: 'CHECK_IN_OUTSIDE_WINDOW',
        message: `Check-in closed: event ended at ${access.endDate.toISOString()}`,
      });
    }

    // ============================================
    // 4. Execute check-in on aggregate
    // ============================================
    const [ticketType] = await this.eventQuery.getTicketTypesByIds([
      ticket.ticketTypeId,
    ]);
    const checkInResult = ticket.checkIn(
      command.staffId,
      command.locationGate,
      ticket.holderName,
      ticketType?.name ?? 'Unknown ticket type',
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
      authorizationSource: access.authorizationSource,
      assignmentId: access.assignmentId,
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
      if (isValid) {
        const committed =
          await this.ticketCheckInPersistence.commitSuccessfulCheckIn(
            ticket,
            checkInEntityResult.value,
          );

        if (!committed) {
          const concurrentAudit = CheckInEntity.create({
            ticketId: ticket.id,
            eventId: ticket.eventId,
            staffId: command.staffId,
            deviceId: command.deviceId,
            locationGate: command.locationGate,
            isValid: false,
            failureReason: 'Ticket was already checked in',
            authorizationSource: access.authorizationSource,
            assignmentId: access.assignmentId,
          });
          if (concurrentAudit.isSuccess) {
            await this.checkInRepository.save(concurrentAudit.value);
          }

          return Result.fail({
            type: 'CHECK_IN_FAILED',
            message: 'Ticket was already checked in',
          });
        }
      } else {
        await this.checkInRepository.save(checkInEntityResult.value);
      }

    } catch (error) {
      this.logger.error(`Failed to save check-in: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to process check-in: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    try {
      await this.eventPublisher.publishFromAggregate(ticket);
    } catch (error) {
      this.logger.error(
        `Check-in persisted but event publication failed for ticket ${ticket.id}: ${error}`,
      );
    }

    if (isValid) {
      this.logger.log(
        `Ticket ${ticket.id} checked in at ${command.locationGate}`,
      );
      return Result.ok(checkInResult.value);
    }

    this.logger.warn(`Duplicate check-in attempt for ticket ${ticket.id}`);
    return Result.fail({
      type: 'CHECK_IN_FAILED',
      message: checkInResult.error.message,
    });
  }
}
