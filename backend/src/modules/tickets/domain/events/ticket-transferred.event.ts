import { DomainEvent } from '@shared/domain/domain-event.base';

/**
 * Emitted when a ticket is transferred to a new owner
 */
export class TicketTransferredEvent extends DomainEvent {
  constructor(
    public readonly ticketId: string,
    public readonly eventId: string,
    public readonly fromUserId: string,
    public readonly toUserId: string,
    public readonly newQRCode: string,
    public readonly transferCount: number,
  ) {
    super();
  }
}
