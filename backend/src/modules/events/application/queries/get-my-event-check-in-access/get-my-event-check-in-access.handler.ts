import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type { PaginatedEventCheckInAccessDto } from '../../dtos/event-check-in-staff.dto';
import { EVENT_CHECK_IN_ACCESS_READ_PORT } from '../../ports/event-check-in-access-read.port';
import type { EventCheckInAccessReadPort } from '../../ports/event-check-in-access-read.port';
import { EVENT_STAFF_USER_DIRECTORY } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort } from '../../ports/event-staff-user-directory.port';

import {
  GetMyEventCheckInAccessQuery,
  type GetMyEventCheckInAccessError,
} from './get-my-event-check-in-access.query';

@Injectable()
export class GetMyEventCheckInAccessHandler {
  constructor(
    @Inject(EVENT_CHECK_IN_ACCESS_READ_PORT)
    private readonly accessRead: EventCheckInAccessReadPort,
    @Inject(EVENT_STAFF_USER_DIRECTORY)
    private readonly userDirectory: EventStaffUserDirectoryPort,
  ) {}

  async execute(
    query: GetMyEventCheckInAccessQuery,
  ): Promise<
    Result<PaginatedEventCheckInAccessDto, GetMyEventCheckInAccessError>
  > {
    const user = await this.userDirectory.getUserById(query.userId);
    if (!user || !user.isActive || !user.emailVerified) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Check-in access denied',
      });
    }

    return Result.ok(
      await this.accessRead.findAccessibleEvents(
        user.id,
        user.role === 'ADMIN',
        query.page,
        query.limit,
      ),
    );
  }
}