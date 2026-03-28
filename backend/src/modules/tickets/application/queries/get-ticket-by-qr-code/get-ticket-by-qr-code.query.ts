import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { TicketDto } from '../../dtos/ticket.dto';

// ============================================
// Types for GetTicketByQRCode operation
// ============================================

export type GetTicketByQRCodeErrorQuery =
  | { type: 'INVALID_QR_CODE'; message: string }
  | { type: 'TICKET_NOT_FOUND'; message: string };

export type GetTicketByQRCodeResultQuery = TicketDto;

/**
 * Query to look up a ticket by its QR code
 *
 * Used by venue staff for check-in preview before scanning.
 */
export class GetTicketByQRCodeQuery extends BaseQuery<GetTicketByQRCodeResultQuery> {
  constructor(
    public readonly qrCode: string,
  ) {
    super();
    Object.freeze(this);
  }
}
