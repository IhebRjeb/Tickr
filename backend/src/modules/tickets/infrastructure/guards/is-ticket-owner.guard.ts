import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';

import { TICKET_REPOSITORY } from '../../application/ports/ticket.repository.port';
import type { TicketRepositoryPort } from '../../application/ports/ticket.repository.port';

/**
 * Request user interface (from JWT payload)
 */
interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Is Ticket Owner Guard
 *
 * Checks if the authenticated user is the owner of the ticket.
 * Must be used after JwtAuthGuard to ensure user is attached to request.
 *
 * Features:
 * - Extracts ticket ID from route params (:id)
 * - Fetches ticket from repository
 * - Compares ticket.userId with user.userId
 * - Throws 404 if ticket not found
 * - Throws 403 if user is not the owner
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, IsTicketOwnerGuard)
 * @Post(':id/transfer')
 * transferTicket(@Param('id') id: string) { ... }
 * ```
 */
@Injectable()
export class IsTicketOwnerGuard implements CanActivate {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const ticketId = request.params.id;

    if (!ticketId) {
      throw new ForbiddenException('Ticket ID is required');
    }

    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket with id '${ticketId}' not found`);
    }

    if (ticket.userId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this ticket',
      );
    }

    // Attach ticket to request for reuse in handler (optional optimization)
    request.ticket = ticket;

    return true;
  }
}
