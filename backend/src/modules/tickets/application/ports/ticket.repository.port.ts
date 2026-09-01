import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { TicketEntity } from '../../domain/entities/ticket.entity';

/**
 * Injection token for TicketRepository
 */
export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');

/**
 * Ticket Repository Port
 *
 * Defines the contract for ticket persistence operations.
 * Implementation is in infrastructure layer (TypeORM).
 *
 * Design Decisions:
 * - Extends IRepository for base CRUD (findById, save, delete, exists)
 * - Adds ticket-specific query methods
 * - Paginated queries return { data, total } for consistency
 * - findExpiredReservations() supports the expiration cron job
 */
export interface TicketRepositoryPort extends IRepository<TicketEntity> {
  // ============================================
  // Batch Operations
  // ============================================

  saveAll(tickets: TicketEntity[]): Promise<TicketEntity[]>;

  // ============================================
  // Query Methods
  // ============================================

  findByQRCode(qrCode: string): Promise<TicketEntity | null>;

  findByOrderId(orderId: string): Promise<TicketEntity[]>;

  findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }>;

  findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TicketEntity[]; total: number }>;

  findExpiredReservations(): Promise<TicketEntity[]>;

  // ============================================
  // Count Methods
  // ============================================

  countByEventId(eventId: string): Promise<number>;

  countCheckedInByEventId(eventId: string): Promise<number>;

  getCheckInStats(eventId: string): Promise<{
    totalEligible: number;
    checkedIn: number;
    byTicketType: Array<{
      ticketTypeId: string;
      totalEligible: number;
      checkedIn: number;
    }>;
  }>;
}
