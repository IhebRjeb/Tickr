import type { CheckInEntity } from '../../domain/entities/check-in.entity';
import type { TicketEntity } from '../../domain/entities/ticket.entity';

export const TICKET_CHECK_IN_PERSISTENCE_PORT = Symbol(
  'TICKET_CHECK_IN_PERSISTENCE_PORT',
);

export interface TicketCheckInPersistencePort {
  commitSuccessfulCheckIn(
    ticket: TicketEntity,
    checkIn: CheckInEntity,
  ): Promise<boolean>;
}