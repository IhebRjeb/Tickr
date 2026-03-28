import { BaseCommand } from '@shared/application/interfaces/command.interface';

// ============================================
// Types for ExpireTickets operation
// ============================================

/**
 * Error types for ExpireTickets operation
 */
export type ExpireTicketsErrorCommand =
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Result type for ExpireTickets operation
 */
export interface ExpireTicketsResultCommand {
  readonly expiredCount: number;
}

/**
 * Command to expire unpaid ticket reservations
 *
 * Triggered by a scheduled cron job, not by user input.
 * Finds all RESERVED tickets past their reservation TTL
 * and transitions them to EXPIRED.
 */
export class ExpireTicketsCommand extends BaseCommand {
  constructor() {
    super();
    Object.freeze(this);
  }
}
