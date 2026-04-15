import { DomainException } from '@shared/domain/domain-exception.base';

export class MaxTransfersReachedException extends DomainException {
  constructor(message: string) {
    super(message, 'MAX_TRANSFERS_REACHED');
  }

  static forTicket(
    ticketId: string,
    maxTransfers: number,
  ): MaxTransfersReachedException {
    return new MaxTransfersReachedException(
      `Ticket ${ticketId} has reached the maximum of ${maxTransfers} transfers`,
    );
  }
}
