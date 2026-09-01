import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import type {
  EventCheckInStaffAssignmentDto,
  PaginatedEventCheckInStaffAssignmentsDto,
} from '../../dtos/event-check-in-staff.dto';
import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '../../ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentRepositoryPort } from '../../ports/event-check-in-staff-assignment.repository.port';
import { EVENT_STAFF_USER_DIRECTORY } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort } from '../../ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import {
  GetEventCheckInStaffQuery,
  type GetEventCheckInStaffError,
} from './get-event-check-in-staff.query';

@Injectable()
export class GetEventCheckInStaffHandler {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: EventCheckInStaffAssignmentRepositoryPort,
    @Inject(EVENT_STAFF_USER_DIRECTORY)
    private readonly userDirectory: EventStaffUserDirectoryPort,
  ) {}

  async execute(
    query: GetEventCheckInStaffQuery,
  ): Promise<
    Result<PaginatedEventCheckInStaffAssignmentsDto, GetEventCheckInStaffError>
  > {
    const event = await this.eventRepository.findById(query.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${query.eventId}' not found`,
      });
    }

    if (event.organizerId !== query.organizerId) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Only the event owner can view check-in staff',
      });
    }

    const assignments = await this.assignmentRepository.findByEvent(
      query.eventId,
      query.page,
      query.limit,
    );
    const users = await this.userDirectory.getUsersByIds(
      assignments.data.map((assignment) => assignment.userId),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));

    const data = assignments.data.map<EventCheckInStaffAssignmentDto>(
      (assignment) => {
        const user = usersById.get(assignment.userId);
        return {
          id: assignment.id,
          eventId: assignment.eventId,
          userId: assignment.userId,
          email: user?.email ?? null,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          isAccountAvailable: user !== undefined,
          assignedAt: assignment.assignedAt,
          revokedAt: assignment.revokedAt,
        };
      },
    );

    return Result.ok({
      ...assignments,
      data,
    });
  }
}