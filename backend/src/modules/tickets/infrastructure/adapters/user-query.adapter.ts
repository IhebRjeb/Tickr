import {
  USER_REPOSITORY,
} from '@modules/users/application/ports/user.repository.port';
import type { UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';
import { Injectable, Inject, Logger } from '@nestjs/common';

import type { UserQueryPort, UserInfo } from '../../application/ports/user-query.port';

/**
 * User Query Adapter
 *
 * Infrastructure adapter that implements the UserQueryPort.
 * Acts as an anti-corruption layer between Tickets and Users bounded contexts.
 *
 * Design Decisions:
 * - Uses the Users module's repository port (not direct entity access)
 * - Maps Users domain entities to Tickets module query models
 * - Used primarily for ticket transfer (resolve email → user)
 */
@Injectable()
export class UserQueryAdapter implements UserQueryPort {
  private readonly logger = new Logger(UserQueryAdapter.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async getUserByEmail(email: string): Promise<UserInfo | null> {
    this.logger.debug(`Querying user by email: ${email}`);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
