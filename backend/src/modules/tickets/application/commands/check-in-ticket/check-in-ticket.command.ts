import { BaseCommand } from '@shared/application/interfaces/command.interface';

import type { CheckInResultVO } from '../../../domain/value-objects/check-in-result.vo';

// ============================================
// Types for CheckInTicket operation
// ============================================

/**
 * Error types for CheckInTicket operation
 */
export type CheckInTicketErrorCommand =
  | { type: 'INVALID_QR_CODE'; message: string }
  | { type: 'TICKET_NOT_FOUND'; message: string }
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'CHECK_IN_OUTSIDE_WINDOW'; message: string }
  | { type: 'CHECK_IN_FAILED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for CheckInTicket operation
 */
export type CheckInTicketResultCommand = CheckInResultVO;

/**
 * Command to check in a ticket at a venue entrance
 *
 * Validates QR code, checks time window, and records the check-in.
 * Duplicate check-in attempts emit a fraud detection event.
 */
export class CheckInTicketCommand extends BaseCommand {
  constructor(
    /** The scanned QR code string */
    public readonly qrCode: string,
    /** UUID of the staff member scanning */
    public readonly staffId: string,
    /** Device identifier for audit trail */
    public readonly deviceId: string,
    /** Gate/entrance location identifier */
    public readonly locationGate: string,
  ) {
    super();
    Object.freeze(this);
  }
}
