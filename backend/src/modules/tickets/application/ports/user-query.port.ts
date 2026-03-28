/**
 * User Query Port
 *
 * Anti-corruption layer for querying the Users bounded context
 * from the Tickets module. Implementation in infrastructure layer
 * calls the Users module's repository directly.
 *
 * Design Decisions:
 * - Returns plain DTOs (not domain entities) to avoid coupling
 * - Used primarily for ticket transfer (resolve email → user)
 */

import type { UserInfo } from '../models/user-query.model';

// Re-export for convenience
export type { UserInfo };

/**
 * Injection token for UserQueryPort
 */
export const USER_QUERY_PORT = Symbol('USER_QUERY_PORT');

export interface UserQueryPort {
  /**
   * Find user by email (returns null if not found)
   * Used for ticket transfer flow
   */
  getUserByEmail(email: string): Promise<UserInfo | null>;
}
