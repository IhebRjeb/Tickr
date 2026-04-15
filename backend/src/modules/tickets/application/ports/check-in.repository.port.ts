import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { CheckInEntity } from '../../domain/entities/check-in.entity';

/**
 * Injection token for CheckInRepository
 */
export const CHECK_IN_REPOSITORY = Symbol('CHECK_IN_REPOSITORY');

/**
 * Check-In Repository Port
 *
 * Defines the contract for check-in audit trail persistence.
 * Implementation is in infrastructure layer (TypeORM).
 *
 * Design Decisions:
 * - Extends IRepository for base CRUD
 * - Records both valid and invalid check-in attempts
 * - Paginated queries for event-level dashboard
 */
export interface CheckInRepositoryPort extends IRepository<CheckInEntity> {
  // ============================================
  // Query Methods
  // ============================================

  findByTicketId(ticketId: string): Promise<CheckInEntity[]>;

  findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: CheckInEntity[]; total: number }>;

  // ============================================
  // Count Methods
  // ============================================

  countByEventId(eventId: string): Promise<number>;
}
