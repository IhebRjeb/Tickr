import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import type { EventCheckInAccessDecision } from '../../models/event-check-in-access.model';
import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '../../ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentRepositoryPort } from '../../ports/event-check-in-staff-assignment.repository.port';
import { EVENT_STAFF_USER_DIRECTORY } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort } from '../../ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import {
  ResolveEventCheckInAccessQuery,
  type ResolveEventCheckInAccessError,
} from './resolve-event-check-in-access.query';

@Injectable()
export class ResolveEventCheckInAccessHandler {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: EventCheckInStaffAssignmentRepositoryPort,
    @Inject(EVENT_STAFF_USER_DIRECTORY)
    private readonly userDirectory: EventStaffUserDirectoryPort,
  ) {}

  async execute(
    query: ResolveEventCheckInAccessQuery,
  ): Promise<
    Result<EventCheckInAccessDecision, ResolveEventCheckInAccessError>
  > {
    const user = await this.userDirectory.getUserById(query.actorId);
    if (!user || !user.isActive || !user.emailVerified) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Check-in access denied',
      });
    }

    const event = await this.eventRepository.findById(query.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${query.eventId}' not found`,
      });
    }

    const isAdmin = user.role === 'ADMIN';
    const isOwner = event.organizerId === user.id;
    const assignment =
      isAdmin || isOwner
        ? null
        : await this.assignmentRepository.findActiveByEventAndUser(
            event.id,
            user.id,
          );

    if (!isAdmin && !isOwner && !assignment) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Check-in access denied',
      });
    }

    const authorizationSource = isAdmin
      ? 'ADMIN'
      : isOwner
        ? 'OWNER'
        : 'ASSIGNMENT';
    const isPublished = event.status === EventStatus.PUBLISHED;

    return Result.ok({
      eventId: event.id,
      startDate: event.dateRange.startDate,
      endDate: event.dateRange.endDate,
      authorizationSource,
      assignmentId: assignment?.id ?? null,
      canCheckIn: isPublished,
      canViewBasicStats: isAdmin || isOwner || isPublished,
    });
  }
}