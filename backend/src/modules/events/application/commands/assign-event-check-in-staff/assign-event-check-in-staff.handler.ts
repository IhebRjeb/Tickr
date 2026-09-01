import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EventCheckInStaffAssignmentEntity } from '../../../domain/entities/event-check-in-staff-assignment.entity';
import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '../../ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentRepositoryPort } from '../../ports/event-check-in-staff-assignment.repository.port';
import { EVENT_STAFF_USER_DIRECTORY } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort } from '../../ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import {
  AssignEventCheckInStaffCommand,
  type AssignEventCheckInStaffError,
  type AssignEventCheckInStaffResult,
} from './assign-event-check-in-staff.command';

@Injectable()
export class AssignEventCheckInStaffHandler {
  private readonly logger = new Logger(AssignEventCheckInStaffHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: EventCheckInStaffAssignmentRepositoryPort,
    @Inject(EVENT_STAFF_USER_DIRECTORY)
    private readonly userDirectory: EventStaffUserDirectoryPort,
  ) {}

  async execute(
    command: AssignEventCheckInStaffCommand,
  ): Promise<
    Result<AssignEventCheckInStaffResult, AssignEventCheckInStaffError>
  > {
    const event = await this.eventRepository.findById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    if (event.organizerId !== command.organizerId) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Only the event owner can manage check-in staff',
      });
    }

    if (
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.COMPLETED
    ) {
      return Result.fail({
        type: 'EVENT_NOT_ASSIGNABLE',
        message: 'Check-in staff cannot be assigned to a closed event',
      });
    }

    const user = await this.userDirectory.getUserByEmail(command.email);
    if (
      !user ||
      !user.isActive ||
      !user.emailVerified ||
      user.id === event.organizerId
    ) {
      return Result.fail({
        type: 'TARGET_NOT_ELIGIBLE',
        message: 'User is not eligible for check-in staff assignment',
      });
    }

    const existing = await this.assignmentRepository.findActiveByEventAndUser(
      event.id,
      user.id,
    );
    if (existing) {
      return Result.fail({
        type: 'ALREADY_ASSIGNED',
        message: 'User is already assigned to this event',
      });
    }

    const assignmentResult = EventCheckInStaffAssignmentEntity.create({
      eventId: event.id,
      userId: user.id,
      assignedBy: command.organizerId,
    });
    if (assignmentResult.isFailure) {
      return Result.fail({
        type: 'TARGET_NOT_ELIGIBLE',
        message: 'User is not eligible for check-in staff assignment',
      });
    }

    try {
      const assignment = await this.assignmentRepository.save(
        assignmentResult.value,
      );
      return Result.ok({
        id: assignment.id,
        eventId: assignment.eventId,
        userId: assignment.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAccountAvailable: true,
        assignedAt: assignment.assignedAt,
        revokedAt: assignment.revokedAt,
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return Result.fail({
          type: 'ALREADY_ASSIGNED',
          message: 'User is already assigned to this event',
        });
      }

      this.logger.error(
        `Failed to assign check-in staff for event ${command.eventId}`,
      );
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to assign check-in staff',
      });
    }
  }

  private isUniqueViolation(error: unknown): error is { code: '23505' } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}