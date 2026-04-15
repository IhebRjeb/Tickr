import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { TICKET_REPOSITORY } from '../../ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../ports/ticket.repository.port';
import { USER_QUERY_PORT } from '../../ports/user-query.port';
import type { UserQueryPort } from '../../ports/user-query.port';

import {
  TransferTicketCommand,
  type TransferTicketErrorCommand,
  type TransferTicketResultCommand,
} from './transfer-ticket.command';

// Re-export types for external use
export type TransferTicketResult = TransferTicketResultCommand;
export type TransferTicketError = TransferTicketErrorCommand;

/**
 * Handler for TransferTicketCommand
 *
 * Transfers ticket ownership and generates a new QR code.
 *
 * Responsibilities:
 * 1. Load ticket and validate ownership
 * 2. Resolve new owner from email via Users port
 * 3. Execute transfer on the ticket aggregate
 * 4. Save updated ticket
 * 5. Publish domain events
 */
@Injectable()
export class TransferTicketHandler {
  private readonly logger = new Logger(TransferTicketHandler.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
    @Inject(USER_QUERY_PORT)
    private readonly userQuery: UserQueryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: TransferTicketCommand,
  ): Promise<Result<TransferTicketResult, TransferTicketError>> {
    this.logger.debug(
      `Transferring ticket ${command.ticketId} to ${command.newOwnerEmail}`,
    );

    // ============================================
    // 1. Load ticket and validate ownership
    // ============================================
    const ticket = await this.ticketRepository.findById(command.ticketId);
    if (!ticket) {
      return Result.fail({
        type: 'TICKET_NOT_FOUND',
        message: `Ticket '${command.ticketId}' not found`,
      });
    }

    if (ticket.userId !== command.currentOwnerId) {
      return Result.fail({
        type: 'NOT_TICKET_OWNER',
        message: 'Only the ticket owner can transfer this ticket',
      });
    }

    // ============================================
    // 2. Resolve new owner from email
    // ============================================
    const newOwner = await this.userQuery.getUserByEmail(
      command.newOwnerEmail,
    );
    if (!newOwner) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `No user found with email '${command.newOwnerEmail}'`,
      });
    }

    // ============================================
    // 3. Execute transfer on aggregate
    // ============================================
    const transferResult = ticket.transfer(newOwner.id, newOwner.email);
    if (transferResult.isFailure) {
      return Result.fail({
        type: 'TRANSFER_FAILED',
        message: transferResult.error.message,
      });
    }

    // ============================================
    // 4. Save updated ticket
    // ============================================
    try {
      await this.ticketRepository.save(ticket);

      // ============================================
      // 5. Publish domain events
      // ============================================
      await this.eventPublisher.publishFromAggregate(ticket);

      const newQrCode = transferResult.value.value;
      this.logger.log(
        `Ticket ${command.ticketId} transferred to user ${newOwner.id}`,
      );

      return Result.ok({ newQrCode });
    } catch (error) {
      this.logger.error(`Failed to save transfer: ${error}`);
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to transfer ticket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
