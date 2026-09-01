import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '../../ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentRepositoryPort } from '../../ports/event-check-in-staff-assignment.repository.port';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import {
  RevokeEventCheckInStaffCommand,
  type RevokeEventCheckInStaffError,
} from './revoke-event-check-in-staff.command';

@Injectable()
export class RevokeEventCheckInStaffHandler {
  private readonly logger = new Logger(RevokeEventCheckInStaffHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: EventCheckInStaffAssignmentRepositoryPort,
  ) {}

  async execute(
    command: RevokeEventCheckInStaffCommand,
  ): Promise<Result<void, RevokeEventCheckInStaffError>> {
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

    const assignment = await this.assignmentRepository.findById(
      command.assignmentId,
    );
    if (!assignment || assignment.eventId !== event.id) {
      return Result.fail({
        type: 'ASSIGNMENT_NOT_FOUND',
        message: 'Check-in staff assignment not found',
      });
    }

    if (!assignment.isActive) {
      return Result.ok(undefined);
    }

    const revokeResult = assignment.revoke(command.organizerId);
    if (revokeResult.isFailure) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to revoke check-in staff assignment',
      });
    }

    try {
      const revoked = await this.assignmentRepository.revoke(assignment);
      if (!revoked) {
        return Result.fail({
          type: 'ASSIGNMENT_NOT_FOUND',
          message: 'Check-in staff assignment not found',
        });
      }
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error(
        `Failed to revoke check-in staff assignment ${command.assignmentId}: ${error}`,
      );
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to revoke check-in staff assignment',
      });
    }
  }
}